import { readFileSync } from "fs";
import { resolve } from "path";

export function adminAuth(currentId: number): boolean {
  const adminIDs: number[] = getAdmins();
  return adminIDs.includes(currentId);
}

function getAdmins(): number[] {
  const filePath = resolve(process.cwd(), "config", "admins.txt");
  const raw = readFileSync(filePath, "utf-8");

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseInt(line, 10))
    .filter((id) => !isNaN(id));
}
