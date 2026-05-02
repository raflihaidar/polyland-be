import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import dotenv from "dotenv";

dotenv.config();

export default buildModule("PolyLandModule", (m) => {
  const adminAddress = process.env.WALLET_ADDRESS!;

  const certificate = m.contract("CertificateNFT", [adminAddress]);

  return { certificate };
});
