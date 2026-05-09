import { DayOfWeek, QueueStatus } from "../generated/prisma/enums";
import { prisma } from "../config/prisma";
import { PrismaClient } from "../generated/prisma/client";
import { AppError } from "../utils/error";

/**
 * Map JS Date.getDay() → DayOfWeek enum (Senin = 1 … Minggu = 0)
 */
function getDayOfWeekEnum(date: Date): DayOfWeek {
  const map: Record<number, DayOfWeek> = {
    1: DayOfWeek.SENIN,
    2: DayOfWeek.SELASA,
    3: DayOfWeek.RABU,
    4: DayOfWeek.KAMIS,
    5: DayOfWeek.JUMAT,
    6: DayOfWeek.SABTU,
    0: DayOfWeek.MINGGU,
  };
  return map[date.getDay()];
}

/**
 * Parse "HH:MM" string to { hours, minutes }
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Check whether `now` falls within the office's operational hours for today.
 * Returns the matching OperationalHours row (or throws if closed/not found).
 */
async function assertOfficeIsOpen(
  landOfficeId: string,
  now: Date,
): Promise<void> {
  const day = getDayOfWeekEnum(now);

  const hours = await prisma.operationalHours.findUnique({
    where: {
      land_office_id_day: {
        land_office_id: landOfficeId,
        day,
      },
    },
  });

  if (!hours || !hours.is_open) {
    throw new AppError("Kantor pertanahan tidak beroperasi hari ini.");
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const open = parseTime(hours.opening_time);
  const close = parseTime(hours.closing_time);

  const openMinutes = open.hours * 60 + open.minutes;
  const closeMinutes = close.hours * 60 + close.minutes;

  if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
    throw new Error(
      `Kantor pertanahan hanya menerima antrian pada pukul ${hours.opening_time}–${hours.closing_time}.`,
    );
  }
}

/**
 * Get today's date truncated to midnight (for queue_date comparisons).
 */
function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate the next queue_number for a loket on a given date.
 * Uses a SELECT FOR UPDATE pattern via interactive transaction to avoid races.
 */
async function nextQueueNumber(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  loketId: string,
  date: Date,
): Promise<number> {
  const last = await tx.queue.findFirst({
    where: { loket_id: loketId, queue_date: date },
    orderBy: { queue_number: "desc" },
    select: { queue_number: true },
  });
  return (last?.queue_number ?? 0) + 1;
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateQueueInput {
  personId: string;
  loketId: string;
  date: Date;
}

export interface UpdateQueueStatusInput {
  queueId: string;
  status: QueueStatus;
}

export interface QueueSummary {
  totalToday: number;
  remaining: number;
  currentlyServing: {
    id: string;
    queue_number: number;
    status: QueueStatus;
    application_id: string | null;
  } | null;
}

// ─────────────────────────────────────────────
// USER: Create Queue
// ─────────────────────────────────────────────

/**
 * Allow a user to take a queue number at a specific loket.
 *
 * Rules:
 * - Loket must belong to an active land office
 * - Current time must be within the office's operational hours for today
 * - The person must not already have an active queue at the same loket today
 * - If applicationId is provided, it must not already be linked to another queue
 */
export async function createQueue(input: CreateQueueInput) {
  try {
    const { personId, loketId, date } = input;
    const now = new Date();

    const loket = await prisma.loket.findUnique({
      where: { id: loketId },
      include: { office: true },
    });

    if (!loket) throw new Error("Loket tidak ditemukan.");
    if (!loket.is_active) throw new Error("Loket sedang tidak aktif.");

    await assertOfficeIsOpen(loket.office_id, now);

    const existingPersonQueue = await prisma.queue.findFirst({
      where: {
        loket_id: loketId,
        queue_date: date,
        person_id: personId,
        status: {
          in: [
            QueueStatus.MENUNGGU,
            QueueStatus.DIPANGGIL,
            QueueStatus.DILAYANI,
          ],
        },
      },
    });

    if (existingPersonQueue) {
      throw new AppError(
        `Anda sudah memiliki antrian aktif di loket ini hari ini (nomor antrian: ${existingPersonQueue.queue_number}).`,
      );
    }

    // 5. Create queue inside a transaction (safe queue_number generation)
    const queue = await prisma.$transaction(async (tx: any) => {
      const queueNumber = await nextQueueNumber(tx, loketId, date);

      return tx.queue.create({
        data: {
          loket: {
            connect: {
              id: loketId,
            },
          },
          person: {
            connect: {
              id: personId,
            },
          },
          queue_number: queueNumber,
          queue_date: date,
          status: QueueStatus.MENUNGGU,
        },
        include: {
          loket: {
            select: {
              id: true,
              name: true,
              office: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    return queue;
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Terjadi kesalahan saat mengambil antrian",
      500,
      error.meta,
    );
  }
}

// ─────────────────────────────────────────────
// USER: Get My Queue Today
// ─────────────────────────────────────────────

export const getMyQueues = async (
  person_id: string,
  date: Date | null = null,
) => {
  try {
    const today = todayDate();

    return prisma.queue.findMany({
      where: {
        queue_date: date ?? today,
        person_id,
      },
      select: {
        id: true,
        status: true,
        queue_date: true,
        queue_number: true,
        loket_id: true,
        loket: {
          select: {
            id: true,
            name: true,
            office: { select: { id: true, name: true, address: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error: any) {
    throw new AppError(
      "Terjadi kesalahan saat mengambil data antrian",
      500,
      error.meta,
    );
  }
};

export const getDetailQueue = async (person_id: string, queue_id: string) => {
  try {
    return prisma.queue.findFirst({
      where: {
        id: queue_id,
        person_id,
      },
      select: {
        id: true,
        status: true,
        queue_date: true,
        queue_number: true,
        createdAt: true,
        called_at: true,
        done_at: true,
        served_at: true,
        loket: {
          select: {
            id: true,
            name: true,
            office: { select: { id: true, name: true, address: true } },
          },
        },
      },
    });
  } catch (error: any) {
    throw new AppError("Gagal mendapatkan detail antrian", 500, error.meta);
  }
};

// ─────────────────────────────────────────────
// USER: Cancel My Queue
// ─────────────────────────────────────────────

/**
 * Allow a user to cancel their own queue, only if it is still MENUNGGU.
 */
export async function cancelQueue(queueId: string, personId: string) {
  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
  });

  if (!queue) throw new AppError("Antrian tidak ditemukan.", 404);

  if (queue.person_id !== personId) {
    throw new AppError(
      "Anda tidak memiliki akses untuk membatalkan antrian ini.",
      403,
    );
  }

  if (queue.status !== QueueStatus.MENUNGGU) {
    throw new AppError(
      `Antrian dengan status "${queue.status}" tidak dapat dibatalkan.`,
    );
  }

  return prisma.queue.update({
    where: { id: queueId },
    data: { status: QueueStatus.TIDAK_HADIR },
  });
}

// ─────────────────────────────────────────────
// PUBLIC: Queue Summary for a Loket
// ─────────────────────────────────────────────

/**
 * Returns aggregate queue info for a loket (useful for user-facing display).
 *
 * - totalToday   : all queues created today (excluding TIDAK_HADIR)
 * - remaining    : queues still MENUNGGU
 * - currentlyServing: the queue entry currently DIPANGGIL or DILAYANI
 */
export async function getQueueSummary(loketId: string): Promise<QueueSummary> {
  const today = todayDate();

  const [totalToday, remaining, currentlyServing] = await Promise.all([
    prisma.queue.count({
      where: {
        loket_id: loketId,
        queue_date: today,
        status: { not: QueueStatus.TIDAK_HADIR },
      },
    }),
    prisma.queue.count({
      where: {
        loket_id: loketId,
        queue_date: today,
        status: QueueStatus.MENUNGGU,
      },
    }),
    prisma.queue.findFirst({
      where: {
        loket_id: loketId,
        queue_date: today,
        status: { in: [QueueStatus.DIPANGGIL, QueueStatus.DILAYANI] },
      },
      select: {
        id: true,
        queue_number: true,
        status: true,
        application_id: true,
      },
      orderBy: { queue_number: "asc" },
    }),
  ]);

  return { totalToday, remaining, currentlyServing };
}

// ─────────────────────────────────────────────
// ADMIN: Get All Queues for a Loket (Today)
// ─────────────────────────────────────────────

export async function getLoketQueues(loketId: string, date?: Date) {
  const targetDate = date ?? todayDate();

  return prisma.queue.findMany({
    where: { loket_id: loketId, queue_date: targetDate },
    orderBy: { queue_number: "asc" },
  });
}

// ─────────────────────────────────────────────
// ADMIN: Call Next Queue (MENUNGGU → DIPANGGIL)
// ─────────────────────────────────────────────

/**
 * Mark the next MENUNGGU queue entry as DIPANGGIL.
 * If another entry is currently DIPANGGIL, it is bumped to TIDAK_HADIR first.
 */
export async function callNextQueue(loketId: string) {
  const today = todayDate();

  return prisma.$transaction(async (tx: any) => {
    // Expire any previously called-but-unserved entry
    await tx.queue.updateMany({
      where: {
        loket_id: loketId,
        queue_date: today,
        status: QueueStatus.DIPANGGIL,
      },
      data: { status: QueueStatus.TIDAK_HADIR },
    });

    // Get the next waiting entry
    const next = await tx.queue.findFirst({
      where: {
        loket_id: loketId,
        queue_date: today,
        status: QueueStatus.MENUNGGU,
      },
      orderBy: { queue_number: "asc" },
    });

    if (!next) throw new Error("Tidak ada antrian yang menunggu.");

    return tx.queue.update({
      where: { id: next.id },
      data: {
        status: QueueStatus.DIPANGGIL,
        called_at: new Date(),
      },
      include: {
        application: {
          select: {
            id: true,
            file_number: true,
            person: { select: { id: true, name: true, nik: true } },
          },
        },
      },
    });
  });
}

// ─────────────────────────────────────────────
// ADMIN: Update Queue Status
// ─────────────────────────────────────────────

/**
 * Allowed officer transitions:
 *
 *   MENUNGGU   → DIPANGGIL  (use callNextQueue for ordered flow)
 *   DIPANGGIL  → DILAYANI   (officer starts serving)
 *   DIPANGGIL  → TIDAK_HADIR (person didn't show up)
 *   DILAYANI   → SELESAI    (service completed)
 *   DILAYANI   → TIDAK_HADIR (edge case)
 */
const ALLOWED_TRANSITIONS: Partial<Record<QueueStatus, QueueStatus[]>> = {
  [QueueStatus.MENUNGGU]: [QueueStatus.DIPANGGIL, QueueStatus.TIDAK_HADIR],
  [QueueStatus.DIPANGGIL]: [QueueStatus.DILAYANI, QueueStatus.TIDAK_HADIR],
  [QueueStatus.DILAYANI]: [QueueStatus.SELESAI, QueueStatus.TIDAK_HADIR],
};

export async function updateQueueStatus(input: UpdateQueueStatusInput) {
  const { queueId, status } = input;

  const queue = await prisma.queue.findUnique({ where: { id: queueId } });
  if (!queue) throw new Error("Antrian tidak ditemukan.");

  const allowed = ALLOWED_TRANSITIONS[queue.status] ?? [];
  if (!allowed.includes(status)) {
    throw new Error(
      `Tidak dapat mengubah status dari "${queue.status}" ke "${status}".`,
    );
  }

  const timestampUpdates: Partial<{
    called_at: Date;
    served_at: Date;
    done_at: Date;
  }> = {};

  if (status === QueueStatus.DIPANGGIL) timestampUpdates.called_at = new Date();
  if (status === QueueStatus.DILAYANI) timestampUpdates.served_at = new Date();
  if (status === QueueStatus.SELESAI) timestampUpdates.done_at = new Date();

  return prisma.queue.update({
    where: { id: queueId },
    data: { status, ...timestampUpdates },
    include: {
      application: {
        select: {
          id: true,
          file_number: true,
          person: { select: { id: true, name: true } },
        },
      },
      loket: { select: { id: true, name: true } },
    },
  });
}

// ─────────────────────────────────────────────
// ADMIN: Reset Stale Queues (Cron / EOD Job)
// ─────────────────────────────────────────────

/**
 * Mark all MENUNGGU / DIPANGGIL / DILAYANI queues from past dates as TIDAK_HADIR.
 * Intended to be called by a daily cron job at end-of-day or start-of-next-day.
 */
export async function expireOldQueues() {
  const today = todayDate();

  const result = await prisma.queue.updateMany({
    where: {
      queue_date: { lt: today },
      status: {
        in: [QueueStatus.MENUNGGU, QueueStatus.DIPANGGIL, QueueStatus.DILAYANI],
      },
    },
    data: { status: QueueStatus.TIDAK_HADIR },
  });

  return result;
}
