import redis from "redis";

const redisClient = redis.createClient({
  url: "redis://127.0.0.1:6379",
  // socket: {
  //   host: "127.0.0.1",
  //   port: 6379,
  // },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
  await redisClient.connect();
})();

export default redisClient;
