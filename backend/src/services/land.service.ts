import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import { AppError } from "../utils/error";

type DBClient = Prisma.TransactionClient | typeof prisma;

export const create = async (db: DBClient = prisma, data: any) => {
  try {
    const land = await db.land.create({
      data: {
        area_size: data.area_size,
        street_address: data.street_address ?? "",
        rt: data.rt ?? "",
        rw: data.rw ?? "",
        ward: data.ward ?? "",
        subdistrict: data.subdistrict ?? "",
        regency: data.regency ?? "",
        province: data.province ?? "",
        province_code: data.province_code,
        regency_code: data.regency_code,
      },
    });

    return land;
  } catch (error: any) {
    throw new AppError(
      "Terjadi kesalahan saat membuat data tanah",
      500,
      error?.message,
    );
  }
};

export const findById = async (db: DBClient = prisma, id: string) => {
  try {
    const land = await db.land.findUnique({
      where: {
        id,
      },
    });

    return land;
  } catch (error: any) {
    throw new AppError(
      "Terjadi kesalahan saat mencari data tanah",
      500,
      error?.message,
    );
  }
};
