import { createHash } from "node:crypto";

// telegram limits callback_data strictly to 64 bytes, so buttons carry
// a short ref instead of the full S3 path. the same path always gets
// the same ref, so a button from an old menu either points to exactly
// the same path or is not found at all
export function pathRef(path: string): string {
  return createHash("sha1").update(path).digest("base64url").slice(0, 10);
}

export function buildPathRefs(paths: string[]): Record<string, string> {
  return Object.fromEntries(paths.map((path) => [pathRef(path), path]));
}
