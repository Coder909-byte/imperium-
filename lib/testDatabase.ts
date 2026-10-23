// Mutating verification must never fall back to the shared .env.local URL.
export function assertIsolatedTestDatabase(connection: string | undefined): string {
  if (!connection) throw new Error("Set DATABASE_URL to a disposable local test database.");
  const url = new URL(connection);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== "55439" || !/^\/imperium_m9_test(?:_[a-z0-9_]+)?$/.test(url.pathname)) {
    throw new Error("Mutating checks require a disposable imperium_m9_test database on loopback port 55439. Shared databases are forbidden.");
  }
  return connection;
}
