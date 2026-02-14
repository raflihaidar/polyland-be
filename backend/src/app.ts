import express from "express";
import "dotenv/config";
import { PinataSDK } from "pinata";
import { File } from "buffer";
import cors from "cors";
import authRouter from "./routes/auth.route";
import mitraRouter from "./routes/mitra.route";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler";
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
app.use("/api/mitra", mitraRouter);

// Error handling
app.use(errorHandler);

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.GATEWAY_URL,
});

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

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
