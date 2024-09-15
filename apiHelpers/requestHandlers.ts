import { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import allowCors from "./allowCors"; // remove .js for local dev
import {
  InitiateUploadResponse,
  UploadResponse,
  UploadTokenObject,
  isInitiateUploadRequest,
  isUploadRequest,
  isUploadTokenObject,
} from "./types"; // remove .js for local dev
import { Bucket, bucketNameFromUri, getSignedUploadUrl } from "./s3Helpers";
import getS3Client from "./getS3Client";

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("Missing SECRET_KEY");
}

const bucketCredentials = process.env.BUCKET_CREDENTIALS;
if (!bucketCredentials) {
    throw new Error('Missing BUCKET_CREDENTIALS');
}

const BUCKET_URI = process.env.BUCKET_URI;
if (!BUCKET_URI) {
    throw new Error('Missing BUCKET_URI');
}

const BUCKET_BASE_URL = process.env.BUCKET_BASE_URL;
if (!BUCKET_BASE_URL) {
    throw new Error('Missing BUCKET_BASE_URL');
}

const bucket: Bucket = {
    uri: BUCKET_URI,
    credentials: bucketCredentials
}

const currentUploadDifficulty = 13;
const currentUploadDelay = 500;

const configureBucketCors = () => {
  const client = getS3Client(bucket);
  const bucketName = bucketNameFromUri(bucket.uri);
  console.info(`Configuring bucket CORS for ${bucketName}`);
  client.putBucketCors({
    Bucket: bucketName,
    CORSConfiguration: {
        CORSRules: [
            {
                AllowedHeaders: ["*"],
                AllowedMethods: ["GET", "HEAD", "PUT"],
                AllowedOrigins: ["*"],
                ExposeHeaders: [] // this might be crucial
            }
        ]
    }
  });
};
configureBucketCors();

export const initiateUploadHandler = allowCors(
  async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      const rr = req.body;
      if (!isInitiateUploadRequest(rr)) {
        throw new Error("Invalid request");
      }
      const { size, fileBaseName } = rr;
      assertValidSize(size);
      const uploadTokenObject: UploadTokenObject = {
        timestamp: Date.now(),
        difficulty: currentUploadDifficulty,
        delay: currentUploadDelay,
        size,
        fileBaseName,
      };
      const uploadToken = JSON.stringify(uploadTokenObject);
      const tokenSignature = await signMessage(uploadToken, SECRET_KEY);
      const resp: InitiateUploadResponse = {
        type: "initiateUploadResponse",
        uploadToken,
        tokenSignature,
      };
      res.status(200).json(resp);
    } catch (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

export const uploadHandler = allowCors(
  async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      const rr = req.body;
      if (!isUploadRequest(rr)) {
        throw new Error("Invalid request");
      }
      const {
        uploadToken,
        tokenSignature,
        size,
        fileBaseName,
        challengeResponse,
      } = rr;
      const tokenSignatureToVerify = await signMessage(
        uploadToken,
        SECRET_KEY,
      );
      if (tokenSignature !== tokenSignatureToVerify) {
        throw new Error("Invalid token signature");
      }
      const uploadTokenObject = JSON.parse(uploadToken);
      if (!isUploadTokenObject(uploadTokenObject)) {
        throw new Error("Invalid upload token");
      }
      const {
        timestamp,
        difficulty,
        delay,
        size: sizeInToken,
        fileBaseName: fileBaseNameInToken,
      } = uploadTokenObject;
      const timestampDifference = Math.abs(Date.now() - timestamp);
      if (timestampDifference < delay) {
        throw new Error("Too soon to upload");
      }
      if (timestampDifference > 60 * 1000) {
        throw new Error("Invalid timestamp for upload token");
      }
      if (size !== sizeInToken) {
        throw new Error("Size does not match upload token");
      }
      if (fileBaseName !== fileBaseNameInToken) {
        throw new Error("File base name does not match upload token");
      }
      const challengeResponseStringToHash = `${uploadToken}${challengeResponse}`;
      const challengeResponseSha1Bits = sha1Bits(challengeResponseStringToHash);
      if (
        challengeResponseSha1Bits.slice(0, difficulty) !==
        "0".repeat(difficulty)
      ) {
        throw new Error("Invalid challenge response");
      }
      const fileId = createRandomId(12);
      // datestring is in the format YYYY-MM-DD
      const date = new Date();
      const dateString = date.toISOString().slice(0, 10);
      const key = `ephemeri/storage/${dateString}/${fileId}/${fileBaseName}`;
      const uploadUrl = await getSignedUploadUrl(bucket, key);
      const downloadUrl = `${BUCKET_BASE_URL}/${key}`;
      const resp: UploadResponse = {
        type: "uploadResponse",
        downloadUrl,
        uploadUrl,
      };
      res.status(200).json(resp);
    } catch (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

const assertValidSize = (size: number) => {
  if (size < 1 || size > 1_000_000_000) {
    throw new Error("Invalid size");
  }
};

const sha1 = (input: string) => {
  const sha1 = crypto.createHash("sha1");
  sha1.update(input);
  return sha1.digest("hex");
};

const sha1Bits = (input: string) => {
  const hash = sha1(input);
  const bits = BigInt("0x" + hash).toString(2);
  const expectedLength = hash.length * 4;
  return bits.padStart(expectedLength, "0");
};

const signMessage = async (message: string, secretKey: string) => {
  const hash = sha1(message + secretKey);
  return hash;
};

const createRandomId = (length: number) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * chars.length);
    id += chars[index];
  }
  return id;
};
