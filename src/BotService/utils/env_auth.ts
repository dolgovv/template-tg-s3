import "dotenv/config";

export function getEnv(key: string, required: true): string;
export function getEnv(key: string, required?: false): string | undefined;
export function getEnv(key: string, required?: boolean): string | undefined {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
