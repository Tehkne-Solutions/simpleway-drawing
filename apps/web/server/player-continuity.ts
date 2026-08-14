import { deriveCreativeTerritories } from "../game/atlas-world";
import { derivePlayerContinuity } from "../game/player-continuity";
import { getActivationRepository, getPixelExpeditionRepository, getStudioEvidenceRepository } from "./runtime";

export async function getPlayerContinuity(userId: string) {
  const [activation, pixel, studio] = await Promise.all([
    getActivationRepository().getSnapshot(userId),
    getPixelExpeditionRepository().getSnapshot(userId),
    getStudioEvidenceRepository().getSnapshot(userId),
  ]);
  const territories = deriveCreativeTerritories(pixel, studio);
  return {
    activation,
    ...derivePlayerContinuity(activation, territories),
  };
}
