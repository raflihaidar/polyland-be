import { prisma } from "../config/prisma";
import { QueueStatus } from "../generated/prisma/enums";

// ─── Buat antrian baru ────────────────────────────────────────────────────────
export async function createQueue(dto: {
  land_office_id: string;
  queue_date: Date;
  person_ids: string[];
}) {
  const { land_office_id, queue_date, person_ids } = dto;

  if (!person_ids || person_ids.length === 0) {
    throw new Error("Minimal 1 orang harus terdaftar dalam antrian");
  }

  const queueNumber = await getNextQueueNumber(land_office_id, queue_date);

  const queue = await prisma.queue.create({
    data: {
      land_office_id,
      queue_date,
      queue_number: queueNumber,
      status: "MENUNGGU",
      attendees: {
        create: person_ids.map((person_id) => ({ person_id })),
      },
    },
    include: {
      attendees: {
        include: { person: true },
      },
      application: true,
      landOffice: true,
    },
  });

  return queue;
}

// ─── Ambil nomor antrian berikutnya ──────────────────────────────────────────
async function getNextQueueNumber(
  land_office_id: string,
  queue_date: Date,
): Promise<number> {
  const startOfDay = new Date(queue_date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(queue_date);
  endOfDay.setHours(23, 59, 59, 999);

  const last = await prisma.queue.findFirst({
    where: {
      land_office_id,
      queue_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { queue_number: "desc" },
  });

  return last ? last.queue_number + 1 : 1;
}

// ─── Update nomor antrian (reschedule) ───────────────────────────────────────
export async function updateQueueNumber(dto: {
  queue_id: string;
  new_date: Date;
}) {
  const { queue_id, new_date } = dto;

  const queue = await prisma.queue.findUnique({
    where: { id: queue_id },
  });
  if (!queue) throw new Error("Antrian tidak ditemukan");

  if (queue.status !== "MENUNGGU") {
    throw new Error("Hanya antrian berstatus MENUNGGU yang bisa diubah");
  }

  const newQueueNumber = await getNextQueueNumber(
    queue.land_office_id,
    new_date,
  );

  const updated = await prisma.queue.update({
    where: { id: queue_id },
    data: {
      queue_date: new_date,
      queue_number: newQueueNumber,
    },
    include: {
      attendees: {
        include: { person: true },
      },
    },
  });

  return updated;
}

// ─── Update status antrian ────────────────────────────────────────────────────
export async function updateQueueStatus(dto: {
  queue_id: string;
  status: QueueStatus;
}) {
  const { queue_id, status } = dto;

  const queue = await prisma.queue.findUnique({
    where: { id: queue_id },
  });
  if (!queue) throw new Error("Antrian tidak ditemukan");

  const data: Record<string, unknown> = { status };

  if (status === "DIPANGGIL") data.called_at = new Date();
  if (status === "DILAYANI") data.served_at = new Date();

  const updated = await prisma.queue.update({
    where: { id: queue_id },
    data,
    include: {
      attendees: {
        include: { person: true },
      },
    },
  });

  return updated;
}

// ─── Tambah attendee ke antrian ───────────────────────────────────────────────
export async function addAttendee(dto: {
  queue_id: string;
  person_id: string;
}) {
  const { queue_id, person_id } = dto;

  const queue = await prisma.queue.findUnique({
    where: { id: queue_id },
  });
  if (!queue) throw new Error("Antrian tidak ditemukan");

  if (queue.status !== "MENUNGGU") {
    throw new Error("Tidak bisa menambah attendee, antrian sudah diproses");
  }

  // Cek duplikat
  const exists = await prisma.queueAttendee.findUnique({
    where: { queue_id_person_id: { queue_id, person_id } },
  });
  if (exists) throw new Error("Person sudah terdaftar dalam antrian ini");

  return prisma.queueAttendee.create({
    data: { queue_id, person_id },
    include: { person: true },
  });
}

// ─── Hapus attendee dari antrian ──────────────────────────────────────────────
export async function removeAttendee(dto: {
  queue_id: string;
  person_id: string;
}) {
  const { queue_id, person_id } = dto;

  const attendee = await prisma.queueAttendee.findUnique({
    where: { queue_id_person_id: { queue_id, person_id } },
  });
  if (!attendee) throw new Error("Attendee tidak ditemukan");

  return prisma.queueAttendee.delete({
    where: { queue_id_person_id: { queue_id, person_id } },
  });
}

// ─── Get antrian by ID ────────────────────────────────────────────────────────
export async function getQueueById(queue_id: string) {
  const queue = await prisma.queue.findUnique({
    where: { id: queue_id },
    include: {
      attendees: {
        include: { person: true },
      },
      landOffice: true,
    },
  });
  if (!queue) throw new Error("Antrian tidak ditemukan");
  return queue;
}

// ─── Get daftar antrian per kantor & tanggal ──────────────────────────────────
export async function getQueuesByOfficeAndDate(dto: {
  land_office_id: string;
  queue_date: Date;
  status?: QueueStatus;
}) {
  const { land_office_id, queue_date, status } = dto;

  const startOfDay = new Date(queue_date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(queue_date);
  endOfDay.setHours(23, 59, 59, 999);

  return prisma.queue.findMany({
    where: {
      land_office_id,
      queue_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      ...(status ? { status } : {}),
    },
    orderBy: { queue_number: "asc" },
    include: {
      attendees: {
        include: { person: true },
      },
      application: true,
    },
  });
}
