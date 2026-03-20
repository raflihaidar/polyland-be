import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import dotenv from "dotenv";

dotenv.config();

export default buildModule("PolyLandModule", (m) => {

  const adminAddress = m.getParameter(
    "adminAddress",
    process.env.WALLET_ADDRESS!
  );

  const usdcAddress = m.getParameter(
    "usdcAddress",
    process.env.USDC_ADDRESS!
  );
  
  const payment = m.contract("ApplicationPayment", [
    usdcAddress
  ]);

  const certificate = m.contract("CertificateNFT", [
    adminAddress,
    payment
  ]);

  return { payment, certificate };
});