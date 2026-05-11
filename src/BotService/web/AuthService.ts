import "dotenv/config";
import { getEnv } from "../utils/env_auth.js";

export class AuthService {
  static adminLogIn(currentId: number): boolean {
    return AuthService.getAdmins().includes(currentId);
  }

  static getWebsiteName(): string {
    return getEnv("WEBSITE_NAME", true);
  }

  private static getAdmins(): number[] {
    const raw = getEnv("ADMIN_IDS", true);

    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => parseInt(s, 10))
      .filter((id) => !isNaN(id));
  }
}
