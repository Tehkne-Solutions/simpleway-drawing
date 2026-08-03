import {
  createDatabase,
  DrizzleDrawingZeroRepository,
  DrizzleFileAssetRepository,
  DrizzleLearningProgressRepository,
  type Database,
} from "@swd/database";
import { ConfirmPrivateUpload, PreparePrivateUpload } from "@swd/domain";
import { CryptoUuidGenerator, S3FileStorage } from "@swd/storage";

let database: Database | undefined;
let storage: S3FileStorage | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

export function getDatabase(): Database {
  database ??= createDatabase(required("DATABASE_URL"));
  return database;
}

export function getStorage(): S3FileStorage {
  storage ??= new S3FileStorage({
    ...(process.env.STORAGE_ENDPOINT ? { endpoint: process.env.STORAGE_ENDPOINT } : {}),
    region: process.env.STORAGE_REGION ?? "auto",
    bucket: required("STORAGE_BUCKET"),
    accessKeyId: required("STORAGE_ACCESS_KEY"),
    secretAccessKey: required("STORAGE_SECRET_KEY"),
  });
  return storage;
}

export function getFileServices(): { prepare: PreparePrivateUpload; confirm: ConfirmPrivateUpload } {
  const files = new DrizzleFileAssetRepository(getDatabase());
  const objectStorage = getStorage();
  return {
    prepare: new PreparePrivateUpload(objectStorage, files, new CryptoUuidGenerator()),
    confirm: new ConfirmPrivateUpload(objectStorage, files),
  };
}

export function getDrawingZeroRepository(): DrizzleDrawingZeroRepository {
  return new DrizzleDrawingZeroRepository(getDatabase());
}

export function getLearningProgressRepository(): DrizzleLearningProgressRepository {
  return new DrizzleLearningProgressRepository(getDatabase());
}
