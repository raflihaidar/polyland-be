import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const certificateQueue = new Queue("certificate", {
  connection: redisConnection,
});
