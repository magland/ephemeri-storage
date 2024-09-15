// initiateUpload
export type InitiateUploadRequest = {
  type: "initiateUploadRequest";
  size: number;
  fileBaseName: string;
};

export const isInitiateUploadRequest = (x: any): x is InitiateUploadRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateUploadRequest" &&
    typeof x.size === "number" &&
    typeof x.fileBaseName === "string"
  );
};

export type InitiateUploadResponse = {
  type: "initiateUploadResponse";
  uploadToken: string;
  tokenSignature: string;
};

export const isInitiateUploadResponse = (
  x: any,
): x is InitiateUploadResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "initiateUploadResponse" &&
    typeof x.uploadToken === "string" &&
    typeof x.tokenSignature === "string"
  );
};

// upload
export type UploadRequest = {
  type: "uploadRequest";
  uploadToken: string;
  tokenSignature: string;
  challengeResponse: string;
  size: number;
  fileBaseName: string;
};

export const isUploadRequest = (x: any): x is UploadRequest => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "uploadRequest" &&
    typeof x.uploadToken === "string" &&
    typeof x.tokenSignature === "string" &&
    typeof x.challengeResponse === "string" &&
    typeof x.size === "number" &&
    typeof x.fileBaseName === "string"
  );
};

export type UploadResponse = {
  type: "uploadResponse";
  uploadUrl: string;
  downloadUrl: string;
};

export const isUploadResponse = (x: any): x is UploadResponse => {
  return (
    x &&
    typeof x === "object" &&
    x.type === "uploadResponse" &&
    typeof x.uploadUrl === "string" &&
    typeof x.downloadUrl === "string"
  );
};

export type UploadTokenObject = {
  timestamp: number;
  difficulty: number;
  delay: number;
  size: number;
  fileBaseName: string;
};

export const isUploadTokenObject = (x: any): x is UploadTokenObject => {
  return (
    x &&
    typeof x === "object" &&
    typeof x.timestamp === "number" &&
    typeof x.difficulty === "number" &&
    typeof x.delay === "number" &&
    typeof x.size === "number" &&
    typeof x.fileBaseName === "string"
  );
};
