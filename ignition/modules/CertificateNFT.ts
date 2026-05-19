import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import dotenv from "dotenv";

dotenv.config();

export default buildModule("PolyLandModule", (m) => {
  // const adminAddress = process.env.WALLET_ADDRESS!;
  const adminAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  const certificate = m.contract("CertificateNFT", [adminAddress]);

  return { certificate };
});
