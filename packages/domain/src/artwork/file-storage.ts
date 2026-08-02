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

export interface FileStoragePort {
  createPrivateUpload(input: CreatePrivateUploadInput): Promise<PrivateUploadIntent>;
  deletePrivateFile(storageKey: string): Promise<void>;
}

export interface FileAssetRepository {
  createPending(input: PendingFileAssetInput): Promise<void>;
  markReady(fileAssetId: string, ownerUserId: UserId): Promise<void>;
}

export class PreparePrivateUpload {
  constructor(
    private readonly storage: FileStoragePort,
    private readonly files: FileAssetRepository,
  ) {}

  async execute(input: Omit<CreatePrivateUploadInput, "fileAssetId">): Promise<PrivateUploadIntent> {
    const fileAssetId = crypto.randomUUID();
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
