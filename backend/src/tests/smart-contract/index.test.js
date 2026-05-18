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

    // --- TAMBAHKAN KODE INI UNTUK MENGHITUNG GAS ---
    const gasUsed = receipt.gasUsed; // Jumlah unit gas yang dikonsumsi (BigInt)
    const effectiveGasPrice = receipt.effectiveGasPrice; // Harga gas per unit (BigInt)
    const totalGasCostWei = gasUsed * effectiveGasPrice; // Total biaya dalam WEI

    // Konversi ke ETH agar lebih mudah dibaca manusia
    const gasCostInEth = Number(totalGasCostWei) / 1e18;

    // Cetak hasilnya ke terminal saat test berjalan
    console.log(`\n================ GAS STATS ================`);
    console.log(`Gas Used           : ${gasUsed.toString()} units`);
    console.log(`Effective Gas Price: ${Number(effectiveGasPrice) / 1e9} Gwei`);
    console.log(`Total Gas Cost     : ${gasCostInEth} ETH`);
    console.log(`===========================================:\n`);
    // -----------------------------------------------

    // 4. validasi sukses
    expect(receipt.status).toBe("success");
  });
});

// import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
// import { privateKeyToAccount } from "viem/accounts";
// import { polygonAmoy } from "viem/chains"; // 1. Import bawaan dari Viem
// import { describe, expect, it } from "vitest";

// // GANTI dengan alamat contract Anda yang sudah ter-deploy DI JARINGAN AMOY
// const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
// const privateKeyWallet = process.env.PRIVATE_KEY;

// const abi = parseAbi([
//   "function mintCertificate(address recipient) returns (uint256)",
// ]);

// // 2. Hubungkan Public Client ke Amoy
// const publicClient = createPublicClient({
//   chain: polygonAmoy,
//   transport: http(), // Menggunakan RPC publik bawaan Viem atau isi rpc alternatif Anda
// });

// // 3. Hubungkan Wallet Client ke Amoy
// const walletClient = createWalletClient({
//   chain: polygonAmoy,
//   transport: http(),
//   account: privateKeyToAccount(
//     "0x9a8f775f04f5c7a3a42c144f7e09c9f91536007cd9b87ef042da84c5b7c86251",
//   ),
// });

// describe("mintCertificate di Amoy", () => {
//   it("should mint NFT certificate and calculate live gas", async () => {
//     const recipient = "0xe21f3a77583eb9e6457340d8eec8763df2412293";

//     // 4. Kirim Transaksi Nyata ke Testnet
//     const hash = await walletClient.writeContract({
//       address: "0x30C215AcD8Ac2D5D4485733e2419E6bd7bb0adc3",
//       abi,
//       functionName: "mintCertificate",
//       args: [recipient],
//     });

//     console.log(`Transaksi terkirim! Tx Hash: https://polygonscan.com{hash}`);

//     // 5. Tunggu block dikonfirmasi di jaringan Amoy (butuh waktu ~2-5 detik)
//     const receipt = await publicClient.waitForTransactionReceipt({ hash });

//     // 6. Hitung biaya gas nyata di Amoy
//     const gasUsed = receipt.gasUsed;
//     const effectiveGasPrice = receipt.effectiveGasPrice;
//     const totalGasCostWei = gasUsed * effectiveGasPrice;

//     // Amoy menggunakan POL sebagai native token, pembaginya tetap 1e18
//     const gasCostInPol = Number(totalGasCostWei) / 1e18;

//     console.log(`\n================ LIVE AMOY GAS STATS ================`);
//     console.log(`Gas Used           : ${gasUsed.toString()} units`);
//     console.log(`Effective Gas Price: ${Number(effectiveGasPrice) / 1e9} Gwei`);
//     console.log(`Total Gas Cost     : ${gasCostInPol} POL`);
//     console.log(`====================================================:\n`);

//     expect(receipt.status).toBe("success");
//   }, 30000); // Tambahkan timeout 30 detik karena transaksi testnet butuh waktu lebih lama dibanding lokal
// });
