import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client/extension";
import {
  CertificateStatus,
  CertificateType,
} from "../../generated/prisma/enums.js";
import {
  generateNIB,
  generateUniqueCode,
} from "../../services/certificate.service.js";
import "dotenv/config";

export const landCertificateModule = async (prisma: PrismaClient) => {
  const PERSON_ID = process.env.ADMIN_LAND;

  function randomRT() {
    return String(faker.number.int({ min: 1, max: 10 })).padStart(3, "0");
  }

  function randomRW() {
    return String(faker.number.int({ min: 1, max: 10 })).padStart(3, "0");
  }

  function randomArea() {
    return `${faker.number.int({ min: 60, max: 300 })} m2`;
  }

  const bunga = [
    "Melati",
    "Mawar",
    "Anggrek",
    "Tulip",
    "Kenanga",
    "Kamboja",
    "Bougenville",
    "Teratai",
    "Flamboyan",
    "Dahlia",
    "Cempaka",
    "Edelweis",
  ];

  function randomAddress() {
    const namaBunga = bunga[Math.floor(Math.random() * bunga.length)];
    return `Jl. ${namaBunga} No. ${faker.number.int({ min: 1, max: 200 })}`;
  }

  const getVillagesByRegency = async (regencyCode: number) => {
    return prisma.village.findMany({
      where: {
        district: {
          regency_code: regencyCode,
        },
      },
      include: {
        district: {
          include: {
            regency: {
              include: {
                province: true,
              },
            },
          },
        },
      },
    });
  };

  try {
    const surabayaVillages = await getVillagesByRegency(3578);
    const jemberVillages = await getVillagesByRegency(3509);

    if (!surabayaVillages.length || !jemberVillages.length) {
      throw new Error("Village Surabaya / Jember kosong");
    }

    const BATCH_SIZE = 10; // agar tidak overload DB

    const createLandWithCert = async (
      villages: any[],
      total: number,
      label: string,
    ) => {
      let created = 0;

      while (created < total) {
        const batchCount = Math.min(BATCH_SIZE, total - created);

        await Promise.all(
          Array.from({ length: batchCount }).map(async () => {
            const v = villages[Math.floor(Math.random() * villages.length)];

            await prisma.land.create({
              data: {
                area_size: randomArea(),
                street_address: randomAddress(),
                rt: randomRT(),
                rw: randomRW(),

                province_code: Number(v.district.regency.province.code),
                regency_code: Number(v.district.regency.code),
                district_code: Number(v.district.code),
                village_code: String(v.code),

                certificates: {
                  create: {
                    nib: await generateNIB(
                      Number(v.district.regency.province.code),
                      Number(v.district.regency.code),
                      1,
                    ),
                    code: generateUniqueCode(6),
                    type: CertificateType.SHM,
                    status: CertificateStatus.AKTIF,

                    owners: {
                      create: {
                        person_id: PERSON_ID,
                        ownership_pct: 1,
                      },
                    },
                  },
                },
              },
            });
          }),
        );

        created += batchCount;
        console.log(`⏳ ${label}: ${created}/${total} selesai`);
      }
    };

    await createLandWithCert(surabayaVillages, 150, "Surabaya");
    console.log("✅ Surabaya done (150 certificates)");

    await createLandWithCert(jemberVillages, 150, "Jember");
    console.log("✅ Jember done (150 certificates)");

    console.log("🎉 Seed land + certificate selesai — total 300 data");
  } catch (err) {
    console.error("❌ Error seed land:", err);
  }
};
