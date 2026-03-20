import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import type {
  CreateLandOfficeInput,
  UpdateLandOfficeInput,
} from "../types/domain/landOffice.type";
import { AppError } from "../utils/error";

export type LandOfficeResponse = Prisma.LandOfficeGetPayload<{}>;

type GetLandOfficesParams = {
  page?: number;
  limit?: number;
  search?: string;
};


export const createLandOffice = async (
  data: CreateLandOfficeInput
): Promise<LandOfficeResponse> => {
  try {
    const landOffice = await prisma.landOffice.create({
      data,
    });

    return landOffice;
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new AppError("Kode land office sudah digunakan", 400);
      }
    }

    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Gagal membuat land office", 500, err.meta);
  }
};

export const getLandOffices = async ({
  page = 1,
  limit = 10,
  search,
}: GetLandOfficesParams) => {
  try {
    const skip = (page - 1) * limit;

    const where: Prisma.LandOfficeWhereInput = search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              code: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              province: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              regency: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.landOffice.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.landOffice.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal mengambil data kantor pertanahan", 500, err.meta);
  }
};

export const getLandOfficeById = async (
  id: string
): Promise<LandOfficeResponse | null> => {
  try {
    const landOffice = await prisma.landOffice.findUnique({
      where: {
        id,
      },
    });

    if(!landOffice) new AppError("Kantor pertanahan tidak ditemukan", 404)

    return landOffice;
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal mengambil land office", 500, err.meta);
  }
};


export const updateLandOffice = async (
  id: string,
  data: UpdateLandOfficeInput
): Promise<LandOfficeResponse> => {
  try {
    const existing = await prisma.landOffice.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("Kantor pertanahan tidak ditemukan", 404);
    }

    const landOffice = await prisma.landOffice.update({
      where: {
        id,
      },
      data,
    });

    return landOffice;
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new AppError("Kode land office sudah digunakan", 400);
      }
    }

    throw new AppError("Gagal memperbarui land office", 500, err.meta);
  }
};

export const deleteLandOffice = async (
  id: string
): Promise<LandOfficeResponse> => {
  try {
    const existing = await prisma.landOffice.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("Kantor pertanahan tidak ditemukan", 404);
    }

    const landOffice = await prisma.landOffice.delete({
      where: {
        id,
      },
    });

    return landOffice;
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Gagal menghapus kantor pertanahan", 500, err.meta);
  }
};