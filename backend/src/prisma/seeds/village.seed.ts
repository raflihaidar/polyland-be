import { PrismaClient } from "@prisma/client/extension";
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, "../../data/villages.csv");

export const villageModule = async (prisma: PrismaClient) => {
  const results: any = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      results.push(row);
    })
    .on("end", async () => {
      try {
        const data = results.map((r: any) => ({
          code: BigInt(r.code),
          district_code: Number(r.district_code),
          name: r.name,
        }));

        await prisma.village.createMany({
          data,
          skipDuplicates: true,
        });

        console.log("Seed Village selesai");
      } catch (err) {
        console.error(err);
      }
    });
};
