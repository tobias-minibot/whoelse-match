import { WhoElseEngine, type Entity } from "@whoelse/core";
import seed from "../../data/seed.json";

const globalForEngine = globalThis as unknown as { whoelse?: WhoElseEngine };

export function getEngine(): WhoElseEngine {
  if (!globalForEngine.whoelse) {
    globalForEngine.whoelse = WhoElseEngine.fromEntities(seed.entities as Entity[]);
  }
  return globalForEngine.whoelse;
}
