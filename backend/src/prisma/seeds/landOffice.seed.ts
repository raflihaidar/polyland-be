import { PrismaClient } from "@prisma/client/extension";

export const landOfficeModules = async (prisma: PrismaClient) => {
  const landOffices = [
    {
      name: "Kantor Pertanahan Kota Surabaya",
      code: "BPN-SBY",
      province: "Jawa Timur",
      regency: "Kota Surabaya",
      address:
        "Jl. Taman Puspa Raya No.10, Sambikerep, Kec. Sambikerep, Surabaya, Indonesia 60217",
      phone: "031-7401467",
      email: "surabaya@atrbpn.go.id",
      price: {
        price_per_m2: 50000,
        registration_fee: 50000,
      },
    },
    {
      name: "Kantor Pertanahan Kabupaten Jember",
      code: "BPN-KAB-JBR",
      province: "Jawa Timur",
      regency: "Kabupaten Jember",
      address:
        "Jl. Nusantara No. 19, Kel. Kaliwates, Kec. Kaliwates, Kab. Jember",
      phone: "0331-7654321",
      email: "kabjember@atrbpn.go.id",
      price: {
        price_per_m2: 50000,
        registration_fee: 50000,
      },
    },
  ];

  const operationalHours = [
    {
      day: "SENIN",
      is_open: true,
      opening_time: "08:00",
      closing_time: "16:00",
    },
    {
      day: "SELASA",
      is_open: true,
      opening_time: "08:00",
      closing_time: "16:00",
    },
    {
      day: "RABU",
      is_open: true,
      opening_time: "08:00",
      closing_time: "16:00",
    },
    {
      day: "KAMIS",
      is_open: true,
      opening_time: "08:00",
      closing_time: "16:00",
    },
    {
      day: "JUMAT",
      is_open: true,
      opening_time: "08:00",
      closing_time: "15:00",
    },
    {
      day: "SABTU",
      is_open: false,
      opening_time: "00:00",
      closing_time: "00:00",
    },
    {
      day: "MINGGU",
      is_open: false,
      opening_time: "00:00",
      closing_time: "00:00",
    },
  ] as const;

  console.log("Seeding Land Offices...");

  for (const office of landOffices) {
    // ── Land Office ──────────────────────────────────────────────
    const landOffice = await prisma.landOffice.upsert({
      where: { code: office.code },
      update: {
        name: office.name,
        province: office.province,
        regency: office.regency,
        address: office.address,
        phone: office.phone,
        email: office.email,
      },
      create: {
        name: office.name,
        code: office.code,
        province: office.province,
        regency: office.regency,
        address: office.address,
        phone: office.phone,
        email: office.email,
      },
    });

    // ── Land Office Price ────────────────────────────────────────
    await prisma.landOfficePrice.upsert({
      where: { land_office_id: landOffice.id },
      update: {
        price_per_m2: office.price.price_per_m2,
        registration_fee: office.price.registration_fee,
      },
      create: {
        land_office_id: landOffice.id,
        price_per_m2: office.price.price_per_m2,
        registration_fee: office.price.registration_fee,
      },
    });

    // ── Operational Hours (Senin–Minggu) ─────────────────────────
    for (const hours of operationalHours) {
      await prisma.operationalHours.upsert({
        where: {
          land_office_id_day: {
            land_office_id: landOffice.id,
            day: hours.day,
          },
        },
        update: {
          is_open: hours.is_open,
          opening_time: hours.opening_time,
          closing_time: hours.closing_time,
        },
        create: {
          land_office_id: landOffice.id,
          day: hours.day,
          is_open: hours.is_open,
          opening_time: hours.opening_time,
          closing_time: hours.closing_time,
        },
      });
    }

    // ── Loket ────────────────────────────────────────────────────
    const existingLoket = await prisma.loket.findFirst({
      where: {
        office_id: landOffice.id,
        name: "Loket Peralihan Hak Tanpa Kuasa",
      },
    });

    if (!existingLoket) {
      await prisma.loket.create({
        data: {
          name: "Loket Peralihan Hak Tanpa Kuasa",
          description: "Layanan peralihan hak atas tanah tanpa kuasa",
          is_active: true,
          office_id: landOffice.id,
        },
      });
    }
  }

  console.log(
    "Land Offices, Prices, Operational Hours & Lokets seeded successfully",
  );
};
