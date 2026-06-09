import express from "express";
import "dotenv/config";
import { PinataSDK } from "pinata";
import cors from "cors";
import cron from "node-cron";
// import { parseAbiItem, hexToString } from "viem";
// import { wsPublicClient } from "./config/wallet";
// import { updateApplicationStatus } from "./services/ownershipTransfer.service";
// import { ApplicationStatus } from "../src/generated/prisma/enums";
import * as QueueService from "./services/queue.service.js";
import authRouter from "./routes/auth.route.js";
import verifAccountRouter from "./routes/verificationAccount.route.js";
import ownershipTFRouter from "./routes/ownershipTransfer.route.js";
import mitraRouter from "./routes/mitra.route.js";
import landOfficeRouter from "./routes/landOffice.route.js";
import certificateRoute from "./routes/certificate.route.js";
import officerRouter from "./routes/officer.route.js";
import loketRouter from "./routes/loket.route.js";
import queueRouter from "./routes/queue.route.js";
import personRouter from "./routes/person.route.js";
import landRouter from "./routes/land.route.js";
import healthRouter from "./routes/health.route.js";
import workerResultRouter from "./routes/worker.route.js";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.APP_PORT || 8000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FE_URL,
    credentials: true,
  }),
);

// ─── Daftarkan di app.js / index.js kamu ─────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/person", personRouter);
app.use("/api/land", landRouter);
app.use("/api/mitra", mitraRouter);
app.use("/api/verification-account", verifAccountRouter);
app.use("/api/ownership-transfer", ownershipTFRouter);
app.use("/api/land-office", landOfficeRouter);
app.use("/api/certificate", certificateRoute);
app.use("/api/officer", officerRouter);
app.use("/api/loket", loketRouter);
app.use("/api/queue", queueRouter);
app.use("/api/health", healthRouter);
app.use("/uploads", express.static(path.join(__dirname, "./uploads")));
app.use("/api/worker-result", workerResultRouter);
app.use(errorHandler);

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.GATEWAY_URL,
});

// function getRandomInt(max: number) {
//   return Math.floor(Math.random() * max);
// }

// wsPublicClient.watchEvent({
//   address: process.env.CERTIFICATE_CONTRACT_ADDRESS as `0x${string}`,
//   event: parseAbiItem(
//     "event CertificateMinted(uint256 indexed tokenId, address indexed recipient, string cid)"
//   ),
//   onLogs: async (logs) => {
//     for (const log of logs) {
//       const { tokenId, recipient, cid } = log.args;
//       const txHash = log.transactionHash;

//       console.log(`Sertifikat berhasil di-mint!`);
//       console.log(`Token ID: ${tokenId?.toString()}`);
//       console.log(`Penerima: ${recipient}`);
//       console.log(`Metadata CID: ${cid}`);

//       // Update status di database tradisional kamu
//       // Gunakan tokenId ini untuk sinkronisasi data sertifikat
//       await updateMintingStatus(tokenId!.toString(), txHash, cid);
//     }
//   },
// });

// app.get("/files", async (req, res) => {
//   try {
//     const files = await pinata.files.public.list();

//     res.json(files);
//   } catch (error) {
//     console.log("Gateway error:", error);
//     res.status(500).json({ error: "Failed to fetch file" });
//   }
// });

app.get("/file/:cid", async (req, res) => {
  try {
    const cid = req.params.cid;

    const file = await pinata.gateways.public.get(cid);

    console.log(file);

    res.json(file.data);
  } catch (error) {
    console.log("Gateway error:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

// app.post("/file/upload", async (req, res) => {
//   const address = req.body?.address;

//   let number = getRandomInt(10);

//   const file = new File(
//     [`sertifikat tanah dari ${address} dengan kode ${number}`],
//     `cert-${number}.txt`,
//     { type: "text/plain" },
//   );
//   const upload = await pinata.upload.public.file(file).keyvalues({
//     address: address,
//   });

//   if (upload)
//     res.status(200).json({
//       message: "Upload to IPFS successfully",
//     });
// });

cron.schedule(
  "0 0 * * *",
  () => {
    QueueService.expireOldQueues();
  },
  {
    timezone: "Asia/Jakarta",
  },
);

app.listen(port, () => console.log(`Server running on port ${port}`));
