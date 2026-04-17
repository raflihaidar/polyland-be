import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { AppError } from "../utils/error";

type DBClient = Prisma.TransactionClient | typeof prisma;

export const increment = async (
  db: DBClient = prisma,
) => {
  try {
      let counter = await db.fileCounter.findUnique({
        where: { id: 1 }
      })

      if (!counter) {
        counter = await db.fileCounter.create({
          data: { id: 1, value: 0 }
        })
      }

      const lastNumber = await db.fileCounter.update({
        where: { id: 1 },
        data: { value: { increment: 1 } }
      })

      return String(lastNumber.value).padStart(3, "0")
  } catch (error: any) {
    throw new AppError(
      "Terjadi kesalahan saat menambah file counter",
      500,
      error?.message
    );
  }
};