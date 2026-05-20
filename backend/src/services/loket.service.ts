import { prisma } from "../config/prisma.js";
import { Loket, Queue } from "../generated/prisma/client.js";
import { AppError } from "../utils/error.js";

export const getLoket = async (office_id: string) => {
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);

    const lokets = await prisma.loket.findMany({
      where: {
        office_id,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,

        _count: {
          select: {
            queue: {
              where: {
                queue_date: {
                  gte: start,
                  lte: end,
                },
              },
            },
          },
        },

        queue: {
          where: {
            queue_date: {
              gte: start,
              lte: end,
            },
          },
          select: {
            queue_number: true,
            status: true,
          },
        },
      },
    });

    return lokets.map((l: Loket) => {
      const sisa = l.queue.filter((q: Queue) => q.status === "MENUNGGU");

      const current = l.queue.find(
        (q: Queue) => q.status === "DIPANGGIL" || q.status === "DILAYANI",
      );

      return {
        id: l.id,
        name: l.name,
        description: l.description,

        total_antrian: l._count.queue,
        sisa_antrian: sisa.length,
        antrian_saat_ini: current || null,
      };
    });
  } catch (err: any) {
    throw new AppError("Gagal melakukan registrasi", 500, err.meta);
  }
};
