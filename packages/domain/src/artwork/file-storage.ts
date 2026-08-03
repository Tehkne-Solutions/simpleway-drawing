import type { UserId } from "../index";

export type SupportedArtworkMimeType = "image/jpeg" | "image/png" | "image/webp";
export type UploadPurpose = "DRAWING_ZERO" | "ARTWORK" | "EXERCISE";

export interface CreatePrivateUploadInput {
  fileAssetId: string;
  ownerUserId: UserId;
  mimeType: SupportedArtworkMimeType;
  byteSize: number;
  purpose: UploadPurpose;
}

export interface PrivateUploadIntent {
  fileAssetId: string;
  storageKey: string;
  uploadUrl: string;
  expiresAt: Date;
}

export interface PendingFileAssetInput {
  id: string;
  ownerUserId: UserId;
  storageKey: string;
  mimeType: SupportedArtworkMimeType;
  byteSize: number;
}

export interface PendingFileAsset extends PendingFileAssetInput {
  status: "PENDING";
}

export interface StoredFileMetadata {
  byteSize: number;
  mimeType: string | null;
}

export interface FileStoragePort {
  createPrivateUpload(input: CreatePrivateUploadInput): Promise<PrivateUploadIntent>;
  verifyPrivateFile(storageKey: string): Promise<StoredFileMetadata>;
  createPrivateReadUrl(storageKey: string, ttlSeconds?: number): Promise<string>;
  deletePrivateFile(storageKey: string): Promise<void>;
}

export interface FileAssetRepository {
  createPending(input: PendingFileAssetInput): Promise<void>;
  getOwnedPending(fileAssetId: string, ownerUserId: UserId): Promise<PendingFileAsset | null>;
  markReady(fileAssetId: string, ownerUserId: UserId): Promise<void>;
}

export interface IdGenerator {
  next(): string;
}

export class PreparePrivateUpload {
  constructor(
    private readonly storage: FileStoragePort,
    private readonly files: FileAssetRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: Omit<CreatePrivateUploadInput, "fileAssetId">): Promise<PrivateUploadIntent> {
    if (input.byteSize <= 0 || input.byteSize > 15 * 1024 * 1024) {
      throw new Error("INVALID_UPLOAD_SIZE");
    }

    const fileAssetId = this.ids.next();
    const intent = await this.storage.createPrivateUpload({ ...input, fileAssetId });

    await this.files.createPending({
      id: fileAssetId,
      ownerUserId: input.ownerUserId,
      storageKey: intent.storageKey,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
    });

    return intent;
  }
}

export class ConfirmPrivateUpload {
  constructor(
    private readonly storage: FileStoragePort,
    private readonly files: FileAssetRepository,
  ) {}

  async execute(fileAssetId: string, ownerUserId: UserId): Promise<void> {
    const pending = await this.files.getOwnedPending(fileAssetId, ownerUserId);
    if (!pending) {
      throw new Error("FILE_ASSET_NOT_PENDING");
    }

    const metadata = await this.storage.verifyPrivateFile(pending.storageKey);
    if (metadata.byteSize !== pending.byteSize) {
      throw new Error("UPLOADED_FILE_SIZE_MISMATCH");
    }
    if (metadata.mimeType && metadata.mimeType !== pending.mimeType) {
      throw new Error("UPLOADED_FILE_TYPE_MISMATCH");
    }

    await this.files.markReady(fileAssetId, ownerUserId);
  }
}
