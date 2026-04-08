import express from "express";
import "dotenv/config";
import { PinataSDK } from "pinata";
import { File } from "buffer";
import cors from "cors";
import http from "http"
import { parseAbiItem, bytesToString, hexToString } from "viem";
import { wsPublicClient } from "./config/wallet";
import { updateApplicationStatus } from "./services/ownershipTransfer.service";
import { generateCertificate } from "./services/document.service";
import { ApplicationStatus } from "../src/generated/prisma/enums";
import authRouter from "./routes/auth.route";
import verifAccountRouter from "./routes/verificationAccount.route";
import ownershipTFRouter from "./routes/ownershipTransfer.route";
import mitraRouter from "./routes/mitra.route";
import landOfficeRouter from "./routes/landOffice.route";
import documentRouter from "./routes/document.route"
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler";
// import { initSocket } from "./config/socket"


const app = express();
const port = process.env.APP_PORT || 8000;
// const server = http.createServer(app)

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FE_URL,
    credentials: true,
  }),
);

app.use("/api/auth", authRouter);
app.use("/api/mitra", mitraRouter);
app.use("/api/verification-account", verifAccountRouter);
app.use("/api/ownership-transfer", ownershipTFRouter);
app.use("/api/land-office", landOfficeRouter)
app.use("/api/document", documentRouter)
app.use(errorHandler);

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.GATEWAY_URL,
});

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

wsPublicClient.watchEvent({
  address: process.env.PAYMENT_CONTRACT_ADDRESS_V4 as `0x${string}`,
  event: parseAbiItem(
    "event PaymentReceived(bytes32 indexed applicationId, bytes32 kantahCode, address indexed payer, uint256 amount)"
  ),
  onLogs: async (logs) => {
    for (const log of logs) {

      const txHash = log.transactionHash
      const { applicationId, payer } = log.args

      const decodedApplicationId = hexToString(applicationId!, {
        size: 32,
      }).replace(/\0/g, "")

      const data = await updateApplicationStatus(decodedApplicationId, ApplicationStatus.PENANDATANGANAN)

      if(data.status === ApplicationStatus.PENANDATANGANAN) {
        await generateCertificate(data?.file_number, txHash)
      }
    }
  }
})

app.get("/files", async (req, res) => {
  try {
    const files = await pinata.files.public.list();

    res.json(files);
  } catch (error) {
    console.log("Gateway error:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

app.get("/file/:cid", async (req, res) => {
  try {
    const cid = req.params.cid;

    const file = await pinata.gateways.public.get(cid);

    res.json(file.data);
  } catch (error) {
    console.log("Gateway error:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

app.post("/file/upload", async (req, res) => {
  const address = req.body?.address;

  let number = getRandomInt(10);

  const file = new File(
    [`sertifikat tanah dari ${address} dengan kode ${number}`],
    `cert-${number}.txt`,
    { type: "text/plain" },
  );
  const upload = await pinata.upload.public.file(file).keyvalues({
    address: address,
  });

  if (upload)
    res.status(200).json({
      message: "Upload to IPFS successfully",
    });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
