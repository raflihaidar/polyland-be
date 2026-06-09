import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import { describe, expect, it } from "vitest";
import "dotenv/config";

const CONTRACT_ADDRESS = "0xbF6790D385828C46C56922Ff6Bd62315a5AE22a4";
const privateKeyWallet =
  "0x9a8f775f04f5c7a3a42c144f7e09c9f91536007cd9b87ef042da84c5b7c86251";

const abi = parseAbi([
  "function isVerified(uint256 tokenId) view returns (bool)",
]);

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});

describe("isVerified di Amoy", () => {
  it("should verify certificate", async () => {
    const start = performance.now();

    const isVerified = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "isVerified",
      args: [2n],
    });

    const duration = performance.now() - start;

    console.log("\n========== READ CONTRACT ==========");
    console.log(`Verified      : ${isVerified}`);
    console.log(`Response Time : ${duration.toFixed(2)} ms`);
    console.log("===================================\n");

    expect(typeof isVerified).toBe("boolean");
  });
});
