// Fails fast with a clear message instead of letting `undefined` leak into
// a client constructor and surface as a cryptic error three layers down.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local (see .env.example).`,
    );
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  BETTER_AUTH_SECRET: requireEnv("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: requireEnv("BETTER_AUTH_URL"),
  GOOGLE_CLIENT_ID: requireEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: requireEnv("GOOGLE_CLIENT_SECRET"),
};
