import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/error.js";

type DBClient = Prisma.TransactionClient | typeof prisma;

export const getAllLand = async () => {
  try {
    const lands = await prisma.land.findMany({
      include: {
        certificates: {
          include: {
            owners: true,
          },
        },
      },
    });

    if (!lands) {
      throw new AppError("Data tanah tidak ditemukan", 400);
    }

    return lands;
  } catch (error: any) {
    throw new AppError(
      "Terjadi kesalahan saat memuat data tanah",
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

// export const create = async (db: DBClient = prisma, data: any) => {
//   try {
//     const land = await db.land.create({
//       data: {
//         area_size: data.area_size,
//         street_address: data.street_address ?? "",
//         rt: data.rt ?? "",
//         rw: data.rw ?? "",
//         regency: data.regency ?? "",
//         province: data.province ?? "",
//         province_code: data.province_code,
//         regency_code: data.regency_code,

//                     area_size: randomArea(),
//             street_address: randomAddress(),
//             rt: randomRT(),
//             rw: randomRW(),

//             province_code: Number(v.district.regency.province.code),
//             regency_code: Number(v.district.regency.code),
//             district_code: Number(v.district.code),
//             village_code: String(v.code),
//       },
//     });

//     return land;
//   } catch (error: any) {
//     throw new AppError(
//       "Terjadi kesalahan saat membuat data tanah",
//       500,
//       error?.message,
//     );
//   }
// };
