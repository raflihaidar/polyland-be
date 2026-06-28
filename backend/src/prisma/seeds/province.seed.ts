import { PrismaClient } from "@prisma/client/extension";
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, "../../data/provinces.csv");

export const provinceModule = async (prisma: PrismaClient) => {
  const results: any = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      results.push(row);
    })
    .on("end", async () => {
      try {
        const data = results.map((r: any) => ({
          id: Number(r.id),
          code: Number(r.code),
          name: r.name,
        }));

        await prisma.province.createMany({
          data,
          skipDuplicates: true,
        });

        console.log("Seed Province selesai");
      } catch (err) {
        console.error(err);
      }
    });
};
