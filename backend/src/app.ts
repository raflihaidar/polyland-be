import express from "express";
import "dotenv/config"
import cors from "cors";
import cron from "node-cron";
import * as QueueService from "./services/queue.service.js";
import authRouter from "./routes/auth.route.js";
import verifAccountRouter from "./routes/verificationAccount.route.js";
import ownershipTFRouter from "./routes/ownershipTransfer.route.js";
import landOfficeRouter from "./routes/landOffice.route.js";
import certificateRoute from "./routes/certificate.route.js";
import officerRouter from "./routes/officer.route.js";
import loketRouter from "./routes/loket.route.js";
import queueRouter from "./routes/queue.route.js";
import personRouter from "./routes/person.route.js";
import landRouter from "./routes/land.route.js";
import referenceDataRouter from "./routes/referenceData.route.js";
import privilegeRouter from "./routes/privilege.route.js";
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

app.use("/api/auth", authRouter);
app.use("/api/person", personRouter);
app.use("/api/land", landRouter);
app.use("/api/verification-account", verifAccountRouter);
app.use("/api/ownership-transfer", ownershipTFRouter);
app.use("/api/land-office", landOfficeRouter);
app.use("/api/certificate", certificateRoute);
app.use("/api/officer", officerRouter);
app.use("/api/loket", loketRouter);
app.use("/api/queue", queueRouter);
app.use("/api/reference", referenceDataRouter);
app.use("/api/privilege", privilegeRouter);
app.use("/api/health", healthRouter);
app.use("/uploads", express.static(path.join(__dirname, "./uploads")));
app.use("/api/worker-result", workerResultRouter);
app.use(errorHandler);

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
