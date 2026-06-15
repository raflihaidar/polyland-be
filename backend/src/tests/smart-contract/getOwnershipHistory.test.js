import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import { describe, expect, it } from "vitest";
import "dotenv/config";

const CONTRACT_ADDRESS = "0xbF6790D385828C46C56922Ff6Bd62315a5AE22a4";
const privateKeyWallet =
  "0x9a8f775f04f5c7a3a42c144f7e09c9f91536007cd9b87ef042da84c5b7c86251";

const abi = parseAbi([
  "function getOwnershipHistory(uint256 tokenId) view returns ((address owner,uint256 timestamp)[])",
]);

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});

describe("getOwnershipHistory di Amoy", () => {
  it("should get ownership history", async () => {
    const start = performance.now();

    const history = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "getOwnershipHistory",
      args: [3n],
    });

    const responseTime = performance.now() - start;

    console.log("\n========== READ CONTRACT ==========");
    console.log(`Response Time : ${responseTime.toFixed(2)} ms`);
    console.log(`Records Found : ${history.length}`);
    console.log("===================================\n");

    console.dir(history, { depth: null });

    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);

    expect(history[0].owner).toMatch(/^0x/i);
    expect(typeof history[0].timestamp).toBe("bigint");

    history.forEach((record) => {
      expect(record.owner).toMatch(/^0x/i);
      expect(typeof record.timestamp).toBe("bigint");
    });
  });
});
