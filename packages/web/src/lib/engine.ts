import { WhoElseEngine } from "@whoelse/core";

const globalForEngine = globalThis as unknown as { whoelse?: WhoElseEngine };

export function getEngine(): WhoElseEngine {
  if (!globalForEngine.whoelse) {
    globalForEngine.whoelse = WhoElseEngine.fromSeed();
  }
  return globalForEngine.whoelse;
}
