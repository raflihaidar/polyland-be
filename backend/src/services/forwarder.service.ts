import { encodeFunctionData, type Address, type Hex } from "viem";
import {
  publicClient,
  contractConfig,
  forwarderConfig,
} from "../config/wallet.js";

const FORWARDER_NAME = "JejakTanahkuForwarder";
const FORWARDER_VERSION = "1";

export interface ForwardRequestData {
  from: Address;
  to: Address;
  value: bigint;
  gas: bigint;
  deadline: number;
  data: Hex;
  signature: Hex;
}

interface BuildMintForwardRequestParams {
  petugasAddress: Address;
  recipientAddress: Address;
  gasLimit?: bigint;
  deadlineInSeconds?: number;
}

interface ForwardRequestTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  };
  types: {
    ForwardRequest: { name: string; type: string }[];
  };
  primaryType: "ForwardRequest";
  message: {
    from: Address;
    to: Address;
    value: bigint;
    gas: bigint;
    nonce: bigint;
    deadline: number;
    data: Hex;
  };
}

export const getForwarderDomain = async () => {
  const chainId = await publicClient.getChainId();

  return {
    name: FORWARDER_NAME,
    version: FORWARDER_VERSION,
    chainId,
    verifyingContract: forwarderConfig.address as Address,
  };
};

export const getForwarderNonce = async (address: Address): Promise<bigint> => {
  return (await publicClient.readContract({
    ...forwarderConfig,
    functionName: "nonces",
    args: [address],
  } as any)) as bigint;
};

/**
 * Dipanggil saat petugas menekan tombol "Terbitkan Sertifikat".
 * Menghasilkan typed data EIP-712 yang harus ditandatangani via MetaMask.
 *
 * deadlineInSeconds dibuat cukup longgar karena eksekusi baru terjadi
 * SETELAH worker selesai generate PDF + upload IPFS (bisa beberapa menit).
 */
export const buildMintForwardRequest = async ({
  petugasAddress,
  recipientAddress,
  gasLimit = 300000n,
  deadlineInSeconds = 3600, // 1 jam, sesuaikan dgn estimasi durasi worker
}: BuildMintForwardRequestParams): Promise<ForwardRequestTypedData> => {
  const nonce = await getForwarderNonce(petugasAddress);
  const deadline = Math.floor(Date.now() / 1000) + deadlineInSeconds;

  const data = encodeFunctionData({
    abi: contractConfig.abi,
    functionName: "mintCertificate",
    args: [recipientAddress],
  });

  const domain = await getForwarderDomain();

  const types = {
    ForwardRequest: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint48" },
      { name: "data", type: "bytes" },
    ],
  };

  const message = {
    from: petugasAddress,
    to: contractConfig.address as Address,
    value: 0n,
    gas: gasLimit,
    nonce,
    deadline,
    data,
  };

  return { domain, types, primaryType: "ForwardRequest", message };
};

export const verifyForwardRequest = async (
  requestData: ForwardRequestData,
): Promise<boolean> => {
  return (await publicClient.readContract({
    ...forwarderConfig,
    functionName: "verify",
    args: [requestData],
  } as any)) as boolean;
};
