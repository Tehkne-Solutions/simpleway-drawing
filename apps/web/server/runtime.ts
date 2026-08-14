import {
  createDatabase,
  DrizzleActivationRepository,
  DrizzleAlphaRepository,
  DrizzleArtworkRepository,
  DrizzleClosedAlphaFeedbackRepository,
  DrizzleClosedAlphaRepository,
  DrizzleCohortAnalyticsRepository,
  DrizzleConstructionRepository,
  DrizzleDrawingZeroRepository,
  DrizzleFileAssetRepository,
  DrizzleFormRepository,
  DrizzleGymRepository,
  DrizzleInvitationRepository,
  DrizzleLearningProgressRepository,
  DrizzleObservationRepository,
  DrizzleOperationsRepository,
  DrizzlePixelExpeditionRepository,
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

export function getDrawingZeroRepository(): DrizzleDrawingZeroRepository { return new DrizzleDrawingZeroRepository(getDatabase()); }
export function getLearningProgressRepository(): DrizzleLearningProgressRepository { return new DrizzleLearningProgressRepository(getDatabase()); }
export function getGymRepository(): DrizzleGymRepository { return new DrizzleGymRepository(getDatabase()); }
export function getObservationRepository(): DrizzleObservationRepository { return new DrizzleObservationRepository(getDatabase()); }
export function getConstructionRepository(): DrizzleConstructionRepository { return new DrizzleConstructionRepository(getDatabase()); }
export function getFormRepository(): DrizzleFormRepository { return new DrizzleFormRepository(getDatabase()); }
export function getArtworkRepository(): DrizzleArtworkRepository { return new DrizzleArtworkRepository(getDatabase()); }
export function getAlphaRepository(): DrizzleAlphaRepository { return new DrizzleAlphaRepository(getDatabase()); }
export function getActivationRepository(): DrizzleActivationRepository { return new DrizzleActivationRepository(getDatabase()); }
export function getClosedAlphaRepository(): DrizzleClosedAlphaRepository { return new DrizzleClosedAlphaRepository(getDatabase()); }
export function getClosedAlphaFeedbackRepository(): DrizzleClosedAlphaFeedbackRepository { return new DrizzleClosedAlphaFeedbackRepository(getDatabase()); }
export function getOperationsRepository(): DrizzleOperationsRepository { return new DrizzleOperationsRepository(getDatabase()); }
export function getInvitationRepository(): DrizzleInvitationRepository { return new DrizzleInvitationRepository(getDatabase()); }
export function getCohortAnalyticsRepository(): DrizzleCohortAnalyticsRepository { return new DrizzleCohortAnalyticsRepository(getDatabase()); }
export function getPixelExpeditionRepository(): DrizzlePixelExpeditionRepository { return new DrizzlePixelExpeditionRepository(getDatabase()); }
