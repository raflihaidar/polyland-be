import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import CertificateABI from "../../../abi/certificateNFT.json";

const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!RPC_URL) {
  throw new Error("RPC_URL is not defined in environment variables");
}

if (!CONTRACT_ADDRESS) {
  throw new Error("CONTRACT_ADDRESS is not defined in environment variables");
}

if (!ADMIN_PRIVATE_KEY) {
  throw new Error("ADMIN_PRIVATE_KEY is not defined in environment variables");
}

const adminAccount = privateKeyToAccount(ADMIN_PRIVATE_KEY as `0x${string}`);

export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(RPC_URL),
});

export const walletClient = createWalletClient({
  account: adminAccount,
  chain: polygonAmoy,
  transport: http(RPC_URL),
});

export const contractConfig = {
  address: CONTRACT_ADDRESS as `0x${string}`,
  abi: CertificateABI,
};
