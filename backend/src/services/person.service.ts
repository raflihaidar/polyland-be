import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/error.js";
import { Prisma } from "../generated/prisma/client.js";

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


export const findAllUser = async (
  page = 1,
  limit = 10,
  search?: string,
  role? : string
) => {
  try {
    const skip = (page - 1) * limit;

    const where: Prisma.PersonWhereInput = {
     isVerified: true,
      ...(search && {
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
      }),
      ...(role && {
        roles : {
        }
      })
    };
    const [data, total] = await Promise.all([
      await prisma.person.findMany({
        where,
        select : {
          id : true,
          name : true,
          nik : true,
          email : true,
          phone : true,
          gender : true,
          roles : {
            select  : {
              id : true,
              role : {
                select : {
                  id : true,
                  name : true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.person.count({ where }),
    ]);
    return {
      users : data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err: any) {
    console.log(err);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal mendapatkan daftar user", 500, err.meta);
  }
};