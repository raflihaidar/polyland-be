import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import dotenv from "dotenv";

dotenv.config();

export default buildModule("PolyLandModule", (m) => {
  const adminAddress = process.env.WALLET_ADDRESS!;

  // 🔹 Deploy ApplicationPayment dulu
  const pricePerSquareMeter = m.getParameter(
    "pricePerSquareMeter",
    "1000000000000000" // 0.001 ETH (contoh)
  );

  const payment = m.contract("ApplicationPayment", [
    pricePerSquareMeter,
  ]);

  // 🔹 Deploy CertificateNFT dengan alamat Payment
  const certificate = m.contract("CertificateNFT", [
    adminAddress,
    payment,
  ]);

  return { payment, certificate };
});