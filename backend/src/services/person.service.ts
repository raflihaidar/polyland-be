import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/error.js";

export const searchPerson = async (search: string) => {
  try {
    const person = await prisma.person.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            nik: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        nik: true,
        email: true,
        phone: true,
      },
    });

    return person;
  } catch (error: any) {
    throw new AppError("Terjadi kesalahan saat mencari data", 500, error?.meta);
  }
};
