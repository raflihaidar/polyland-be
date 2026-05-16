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
