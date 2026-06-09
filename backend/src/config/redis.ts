import redis from "redis";
import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
  await redisClient.connect();
})();

export const redisConnection = new Redis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const PUBSUB_OPTIONS = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,

  connectTimeout: 10_000,
  commandTimeout: 5_000, // aman untuk pub/sub
  socketKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true,

  retryStrategy(times: any) {
    if (times > 5) return null;
    return Math.min(times * 300, 3_000);
  },
};

export const redisSubscriber = new Redis(PUBSUB_OPTIONS);

export const redisPublisher = new Redis(PUBSUB_OPTIONS);
