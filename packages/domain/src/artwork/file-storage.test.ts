import assert from "node:assert/strict";
import test from "node:test";
import {
  ConfirmPrivateUpload,
  type FileAssetRepository,
  type FileStoragePort,
  type PendingFileAsset,
} from "./file-storage";

function fixture(overrides?: Partial<{ byteSize: number; mimeType: string | null }>) {
  const pending: PendingFileAsset = {
    id: "file-1",
    ownerUserId: "user-1",
    storageKey: "private/user-1/drawing_zero/file-1.png",
    mimeType: "image/png",
    byteSize: 123,
    status: "PENDING",
  };
  let ready = false;

  const storage: FileStoragePort = {
    async createPrivateUpload() { throw new Error("not used"); },
    async verifyPrivateFile() {
      return { byteSize: overrides?.byteSize ?? 123, mimeType: overrides?.mimeType ?? "image/png" };
    },
    async createPrivateReadUrl() { return "https://example.test/private"; },
    async deletePrivateFile() {},
  };

  const files: FileAssetRepository = {
    async createPending() {},
    async getOwnedPending(id, owner) {
      return id === pending.id && owner === pending.ownerUserId ? pending : null;
    },
    async markReady() { ready = true; },
  };

  return { service: new ConfirmPrivateUpload(storage, files), isReady: () => ready };
}

test("marks an owned upload ready only after metadata verification", async () => {
  const { service, isReady } = fixture();
  await service.execute("file-1", "user-1");
  assert.equal(isReady(), true);
});

test("rejects mismatched uploaded size", async () => {
  const { service, isReady } = fixture({ byteSize: 999 });
  await assert.rejects(() => service.execute("file-1", "user-1"), /UPLOADED_FILE_SIZE_MISMATCH/);
  assert.equal(isReady(), false);
});

test("rejects a pending file owned by another user", async () => {
  const { service, isReady } = fixture();
  await assert.rejects(() => service.execute("file-1", "other-user"), /FILE_ASSET_NOT_PENDING/);
  assert.equal(isReady(), false);
});
