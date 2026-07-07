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
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, "../../../../.env");

export const landCertificateModule = async (prisma: PrismaClient) => {
  try {
    // Step 1: Register atau ambil ADMIN_LAND
    let PERSON_ID = process.env.ADMIN_LAND;

    if (!PERSON_ID) {
      console.log("⏳ ADMIN_LAND belum ada, register dulu...");

      const response = await fetch(`${process.env.BE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Zaky Chandra Muhammad Raihan",
          username: "zakychandra",
          email: "zakychandra@gmail.com",
          password: "zaky123.",
          confirmPassword: "zaky123.",
        }),
      });

      const json = await response.json();

      if (json.status !== "success") {
        throw new Error(`Register gagal: ${json.message}`);
      }

      PERSON_ID = json.data.id as string;

      let envContent = fs.readFileSync(ENV_PATH, "utf-8");
      if (envContent.includes("ADMIN_LAND=")) {
        envContent = envContent.replace(
          /ADMIN_LAND=.*/,
          `ADMIN_LAND=${PERSON_ID}`,
        );
      } else {
        envContent += `\nADMIN_LAND=${PERSON_ID}`;
      }
      fs.writeFileSync(ENV_PATH, envContent);
      process.env.ADMIN_LAND = PERSON_ID;

      console.log(`✅ Register berhasil, ADMIN_LAND ID: ${PERSON_ID}`);
    } else {
      console.log(`✅ ADMIN_LAND ditemukan: ${PERSON_ID}`);
    }

    // Step 2: Helper functions
    const randomRT = () =>
      String(faker.number.int({ min: 1, max: 10 })).padStart(3, "0");

    const randomRW = () =>
      String(faker.number.int({ min: 1, max: 10 })).padStart(3, "0");

    const randomArea = () => `${faker.number.int({ min: 60, max: 300 })}`;

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

    const randomAddress = () => {
      const namaBunga = bunga[Math.floor(Math.random() * bunga.length)];
      return `Jl. ${namaBunga} No. ${faker.number.int({ min: 1, max: 200 })}`;
    };

    // Step 3: Ambil villages
    const getVillagesByRegency = (regencyCode: number) =>
      prisma.village.findMany({
        where: { district: { regency_code: regencyCode } },
        include: {
          district: {
            include: {
              regency: {
                include: { province: true },
              },
            },
          },
        },
      });

    const surabayaVillages = await getVillagesByRegency(3578);
    const jemberVillages = await getVillagesByRegency(3509);

    if (!surabayaVillages.length || !jemberVillages.length) {
      throw new Error("Village Surabaya / Jember kosong");
    }

    // Step 4: Seed land + certificate
    const BATCH_SIZE = 10;

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
                area_size: Number(randomArea()),
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
    process.exit(1);
  }
};
