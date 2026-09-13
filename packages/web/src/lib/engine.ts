import { WhoElseEngine, type Entity } from "@whoelse/core";
import seed from "../../data/seed.json";

const globalForEngine = globalThis as unknown as { whoelse?: WhoElseEngine };

export function getEngine(): WhoElseEngine {
  if (!globalForEngine.whoelse) {
    const engine = WhoElseEngine.fromEntities(seed.entities as Entity[]);
    engine.ensureDemoAgents();
    globalForEngine.whoelse = engine;
  }
  return globalForEngine.whoelse;
}
