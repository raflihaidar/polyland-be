import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import { describe, expect, it } from "vitest";
import "dotenv/config";

const CONTRACT_ADDRESS = "0xbF6790D385828C46C56922Ff6Bd62315a5AE22a4";
const privateKeyWallet =
  "0x9a8f775f04f5c7a3a42c144f7e09c9f91536007cd9b87ef042da84c5b7c86251";
// const WALLET_ADDRESS = "0xe21f3a77583eb9e6457340d8eec8763df2412293";

const abi = parseAbi([
  "function setCertificateCID(uint256 tokenId, string memory cid)",
]);

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});

const walletClient = createWalletClient({
  chain: polygonAmoy,
  transport: http(),
  account: privateKeyToAccount(privateKeyWallet),
});

describe("setCertificateCID di Amoy", () => {
  it("should set NFT certificate cid and calculate live gas", async () => {
    // const recipient = WALLET_ADDRESS;

    // ── ESTIMASI WAKTU ──────────────────────────────────────────
    const startTotal = performance.now();

    // 1. Kirim transaksi
    const startSend = performance.now();
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: "setCertificateCID",
      args: [2, "bafybeic2e2hgrwnnh6mxaxswcltisrnwai3brpjlgozmwffowgikx53p7m"],
    });
    const sendTime = ((performance.now() - startSend) / 1000).toFixed(2);

    console.log(
      `Transaksi terkirim! Tx Hash: https://amoy.polygonscan.com/tx/${hash}`,
    );

    // 2. Tunggu konfirmasi blok
    const startConfirm = performance.now();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const confirmTime = ((performance.now() - startConfirm) / 1000).toFixed(2);

    const totalTime = ((performance.now() - startTotal) / 1000).toFixed(2);
    // ────────────────────────────────────────────────────────────

    // ── ESTIMASI BIAYA GAS ──────────────────────────────────────
    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = receipt.effectiveGasPrice;
    const totalGasCostWei = gasUsed * effectiveGasPrice;
    const gasCostInPol = Number(totalGasCostWei) / 1e18;
    // ────────────────────────────────────────────────────────────

    console.log(`\n================ LIVE AMOY GAS STATS ================`);
    console.log(`Gas Used           : ${gasUsed.toString()} units`);
    console.log(`Effective Gas Price: ${Number(effectiveGasPrice) / 1e9} Gwei`);
    console.log(`Total Gas Cost     : ${gasCostInPol} POL`);
    console.log(`=====================================================`);
    console.log(`\n================ ESTIMASI WAKTU =====================`);
    console.log(`Waktu Kirim Tx     : ${sendTime}s`);
    console.log(`Waktu Konfirmasi   : ${confirmTime}s`);
    console.log(`Total Waktu        : ${totalTime}s`);
    console.log(`=====================================================\n`);

    expect(receipt.status).toBe("success");
  }, 30000);
});
