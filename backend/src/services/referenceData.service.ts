import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/error.js";
import { VerificationStatus } from "../generated/prisma/enums.js";
import { Prisma } from "../generated/prisma/client.js";

export const findAllRole = async (
    page = 1,
    limit = 10,
    search?: string,
) => {
    try {
        const skip = (page - 1) * limit;
        const where: Prisma.RoleWhereInput = {
            NOT: {
                name: "guest",
            },
            ...(search && {
                OR: [
                    {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            await prisma.role.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                },
                skip,
                take: limit,
                orderBy: {
                    created_at: "desc",
                },
            }),
            prisma.role.count({ where }),
        ]);
        return {
            roles: data,
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
        throw new AppError("Gagal mendapatkan daftar role", 500, err.meta);
    }
};