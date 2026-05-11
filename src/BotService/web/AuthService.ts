import { readFileSync } from "fs";
import { resolve } from "path";

export class AuthService {
  static adminLogIn(currentId: number): boolean {
    const adminIDs: number[] = AuthService.getAdmins();
    return adminIDs.includes(currentId);
  }

  static getWebsiteName(): string {
    const filePath = resolve(process.cwd(), "config", "website_name.txt");
    const raw = readFileSync(filePath, "utf-8");

    return raw.split("\n")[0] || "unknown";
  }

  private static getAdmins(): number[] {
    const filePath = resolve(process.cwd(), "config", "admins.txt");
    const raw = readFileSync(filePath, "utf-8");

    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => parseInt(line, 10))
      .filter((id) => !isNaN(id));
  }
}
