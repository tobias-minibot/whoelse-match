import { bootNetwork, type WhoElseEngine, type WhoElseNetwork } from "@whoelse/core";

const globalFor = globalThis as unknown as {
  whoelseNetwork?: WhoElseNetwork;
  whoelseNetworkPromise?: Promise<WhoElseNetwork>;
};

export function setNetworkForTests(network: WhoElseNetwork | null): void {
  globalFor.whoelseNetwork = network ?? undefined;
  globalFor.whoelseNetworkPromise = undefined;
}

export async function getNetwork(): Promise<WhoElseNetwork> {
  if (globalFor.whoelseNetwork) return globalFor.whoelseNetwork;
  if (!globalFor.whoelseNetworkPromise) {
    globalFor.whoelseNetworkPromise = bootNetwork().then((network) => {
      globalFor.whoelseNetwork = network;
      return network;
    });
  }
  return globalFor.whoelseNetworkPromise;
}

export async function getEngine(): Promise<WhoElseEngine> {
  return (await getNetwork()).engine;
}
