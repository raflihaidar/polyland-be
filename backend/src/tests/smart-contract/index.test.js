const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const privateKeyWallet =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

import { createPublicClient, createWalletClient, http } from "viem";
import { localhost } from "viem/chains";
import { describe, it, expect } from "vitest";
import { parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { keccak256, toBytes } from "viem";

const BPN_ROLE = keccak256(toBytes("BPN_ROLE"));

const hardhatChain = {
  id: 31337,
  name: "Hardhat",
  network: "hardhat",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
};

const abi = parseAbi([
  "function mintCertificate(address recipient) returns (uint256)",
]);

const publicClient = createPublicClient({
  chain: hardhatChain,
  transport: http("http://127.0.0.1:8545"),
});

const walletClient = createWalletClient({
  chain: hardhatChain,
  transport: http("http://127.0.0.1:8545"),
  account: privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  ),
});

describe("mintCertificate", () => {
  it("should mint NFT certificate", async () => {
    const recipient = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

    // 2. call contract
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "mintCertificate",
      args: [recipient],
    });

    // 3. tunggu transaksi selesai
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // 4. validasi sukses
    expect(receipt.status).toBe("success");
  });
});
