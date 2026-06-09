import express, { Request, Response, Router } from "express";
import { redisSubscriber } from "../config/redis.js";

const router: Router = express.Router();
const CHANNEL = "certificate:done";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkerResult {
  jobId: string | undefined;
  status: "completed" | "failed";
  durationMs: number | null;
  error: string | undefined;
  timestamp: number;
}

interface WorkerPublishPayload {
  jobId: string | undefined;
  fileNumber: string;
  status: "completed" | "failed";
  durationMs: number | null;
  error?: string;
  timestamp: number;
}

// ─── In-memory store hasil worker (TTL 10 menit) ─────────────────────────────
// Key: fileNumber, Value: WorkerResult
const resultStore = new Map<string, WorkerResult>();
const STORE_TTL_MS = 10 * 60 * 1_000; // 10 menit

// Bersihkan entry lama tiap 5 menit
setInterval(
  () => {
    const now = Date.now();
    for (const [key, val] of resultStore.entries()) {
      if (now - val.timestamp > STORE_TTL_MS) {
        resultStore.delete(key);
      }
    }
  },
  5 * 60 * 1_000,
);

// ─── Subscribe Redis channel saat server start ────────────────────────────────
redisSubscriber.subscribe(CHANNEL, (err: any, count: any) => {
  if (err) {
    console.error("❌ Gagal subscribe Redis channel:", err.message);
  } else {
    console.log(
      `✅ Subscribed ke Redis channel [${CHANNEL}] — total: ${count}`,
    );
  }
});

redisSubscriber.on("message", (channel: string, message: string) => {
  if (channel !== CHANNEL) return;

  try {
    const payload = JSON.parse(message) as WorkerPublishPayload;
    const { fileNumber, status, durationMs, error, timestamp, jobId } = payload;

    console.log(
      `📩 Worker result diterima — fileNumber: ${fileNumber}, status: ${status}`,
    );
    resultStore.set(fileNumber, {
      jobId,
      status,
      durationMs,
      error,
      timestamp,
    });
  } catch (err) {
    console.error("❌ Gagal parse Redis message:", (err as Error).message);
  }
});

// ─── GET /api/worker-result/:fileNumber ──────────────────────────────────────
router.get("/:fileNumber", (req: Request, res: Response) => {
  const { fileNumber } = req.params;
  const result = resultStore.get(fileNumber as string);

  if (!result) {
    return res.status(202).json({
      status: "pending",
      fileNumber,
      message: "Worker belum selesai, coba lagi",
    });
  }

  return res.status(200).json({
    status: result.status,
    fileNumber,
    jobId: result.jobId,
    durationMs: result.durationMs,
    error: result.error ?? null,
    timestamp: result.timestamp,
  });
});

export default router;
