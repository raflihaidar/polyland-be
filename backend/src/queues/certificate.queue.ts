import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const certificateQueue = new Queue("certificate", {
  connection: redisConnection,
});
