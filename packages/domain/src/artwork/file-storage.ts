import type { UserId } from "../index";

export interface CreatePrivateUploadInput {
  ownerUserId: UserId;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
  purpose: "DRAWING_ZERO" | "ARTWORK" | "EXERCISE";
}

export interface PrivateUploadIntent {
  fileAssetId: string;
  storageKey: string;
  uploadUrl: string;
  expiresAt: Date;
}

export interface FileStoragePort {
  createPrivateUpload(input: CreatePrivateUploadInput): Promise<PrivateUploadIntent>;
  deletePrivateFile(storageKey: string): Promise<void>;
}
