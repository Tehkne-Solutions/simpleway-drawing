import { getArtworkRepository, getStorage } from "../../../../../server/runtime";
import { requireSessionUserId } from "../../../../../server/session";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ artworkId: string }> }) {
  try {
    const userId = await requireSessionUserId();
    const { artworkId } = await context.params;
    const record = await getArtworkRepository().getOwned(userId, artworkId);
    const current = record?.versions[0] ?? null;
    if (!record || !current) return Response.json({ code: "ARTWORK_NOT_FOUND" }, { status: 404, headers: { "cache-control": "no-store" } });
    if (!current.mimeType.startsWith("image/")) return Response.json({ code: "ARTWORK_IMAGE_NOT_AVAILABLE" }, { status: 415, headers: { "cache-control": "no-store" } });

    const file = await getStorage().readPrivateFile(current.storageKey);
    const body = new ArrayBuffer(file.body.byteLength);
    new Uint8Array(body).set(file.body);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": current.mimeType,
        "content-length": String(file.byteSize),
        "cache-control": "no-store, private",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ARTWORK_IMAGE_READ_FAILED";
    return Response.json({ code }, { status: code === "UNAUTHENTICATED" ? 401 : 500, headers: { "cache-control": "no-store" } });
  }
}
