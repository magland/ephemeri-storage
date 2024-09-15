import {
  InitiateUploadRequest,
  UploadRequest,
  isInitiateUploadResponse,
  isUploadResponse,
  isUploadTokenObject,
} from "./types";

export class EphemeriStorageClient {
  constructor(private o: { verbose?: boolean } = {}) {}
  async upload(data: ArrayBuffer, fileBaseName: string) {
    const req: InitiateUploadRequest = {
      type: "initiateUploadRequest",
      size: data.byteLength,
      fileBaseName,
    };
    const resp = await postApiRequest("initiateUpload", req);
    if (!isInitiateUploadResponse(resp)) {
      throw new Error("Invalid response");
    }
    const { uploadToken, tokenSignature } = resp;
    const tokenObject = JSON.parse(uploadToken);
    if (!isUploadTokenObject(tokenObject)) {
      throw new Error("Invalid upload token");
    }
    const { difficulty, delay } = tokenObject;
    const challengeResponse = await solveChallenge(
      resp.uploadToken,
      difficulty,
      delay,
      { verbose: this.o.verbose },
    );
    const req2: UploadRequest = {
      type: "uploadRequest",
      uploadToken: resp.uploadToken,
      tokenSignature,
      size: data.byteLength,
      fileBaseName,
      challengeResponse: challengeResponse,
    };
    const resp2 = await postApiRequest("upload", req2);
    if (!isUploadResponse(resp2)) {
      throw new Error("Invalid response");
    }
    const { uploadUrl, downloadUrl } = resp2;
    await fetch(uploadUrl, {
      method: "PUT",
      body: data,
    });
    return downloadUrl;
  }
}

const solveChallenge = async (
  prefix: string,
  difficulty: number,
  delay: number,
  o: { verbose?: boolean } = {},
): Promise<string> => {
  if (o.verbose) {
    console.info(`Solving challenge with difficulty ${difficulty}`);
  }
  const overallTimer = Date.now();
  let timer2 = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const elapsed2 = Date.now() - timer2;
    if (elapsed2 > 100) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      timer2 = Date.now();
    }
    const overallElapsed = Date.now() - overallTimer;
    if (overallElapsed > 50 * 1000) {
      throw new Error("Timeout");
    }
    const challengeResponse = Math.random().toString().slice(2);
    const challengeResponseStringToHash = `${prefix}${challengeResponse}`;
    const challengeResponseSha1Bits = await sha1Bits(
      challengeResponseStringToHash,
    );
    if (
      challengeResponseSha1Bits.slice(0, difficulty) === "0".repeat(difficulty)
    ) {
      if (o.verbose) {
        console.info(
          `Challenge with difficulty ${difficulty} solved in ${overallElapsed}ms`,
        );
      }
      if (Date.now() - overallTimer < delay) {
        if (o.verbose) {
          console.info(
            `Waiting ${delay - (Date.now() - overallTimer)}ms for delay ${delay}ms to pass`,
          );
        }
        // wait for delay to pass
        while (Date.now() - overallTimer < delay) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      return challengeResponse;
    }
  }
};

const postApiRequest = async (endpoint: string, req: any) => {
  const response = await fetch(`api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

const sha1 = async (input: string) => {
  const msgUint8 = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};

const sha1Bits = async (input: string) => {
  const hash = await sha1(input);
  const bits = BigInt("0x" + hash).toString(2);
  const expectedLength = hash.length * 4;
  return bits.padStart(expectedLength, "0");
};
