import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import dotenv from "dotenv";

dotenv.config();

export default buildModule("JejakTanahkuModule", (m) => {
  // 1. Ambil Parameter Admin Address (SuperAdmin / Cold Wallet BPN)
  const adminAddress = m.getParameter(
    "adminAddress",
    process.env.ADMIN_ADDRESS || process.env.WALLET_ADDRESS!,
  );

  // 2. Deploy PolyLandForwarder (Trusted Forwarder untuk Meta-Transaction)
  const forwarder = m.contract("JejakTanahkuForwarder", []);

  // 3. Deploy CertificateNFT
  // Parameter constructor: [adminAddress, forwarderAddress]
  const certificate = m.contract("CertificateNFT", [
    adminAddress,
    forwarder, // Hardhat Ignition otomatis mengambil address dari hasil deploy forwarder di atas
  ]);

  // Return instance contract untuk dieksport
  return { forwarder, certificate };
});
