import { PrismaClient } from "@prisma/client/extension";

export const landOfficeModules = async (prisma: PrismaClient) => {

  const landOffices = [
    {
      name: "Kantor Pertanahan Kota Surabaya",
      code: "BPN-SBY",
      province: "Jawa Timur",
      regency: "Kota Surabaya",
      address: "Jl. Taman Puspa Raya No.10, Sambikerep, Kec. Sambikerep, Surabaya, Indonesia 60217",
      phone: "031-7401467",
      email: "surabaya@atrbpn.go.id",

      price: {
        price_per_m2: 50000,
        registration_fee: 50000
      }
    },
    {
      name: "Kantor Pertanahan Kabupaten Jember",
      code: "BPN-KAB-JBR",
      province: "Jawa Timur",
      regency: "Kabupaten Jember",
      address: "Jl. Nusantara No. 19, Kel. Kaliwates, Kec. Kaliwates, Kab. Jember",
      phone: "0331-7654321",
      email: "kabjember@atrbpn.go.id",

      price: {
        price_per_m2: 50000,
        registration_fee: 50000
      }
    },
  ];

  console.log("Seeding Land Offices...");

  for (const office of landOffices) {

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

    /**
     * Seeder LandOfficePrice
     */
    await prisma.landOfficePrice.upsert({
      where: {
        land_office_id: landOffice.id
      },
      update: {
        price_per_m2: office.price.price_per_m2,
        registration_fee: office.price.registration_fee
      },
      create: {
        land_office_id: landOffice.id,
        price_per_m2: office.price.price_per_m2,
        registration_fee: office.price.registration_fee
      }
    });

  }

  console.log("Land Offices & Prices seeded successfully");
};