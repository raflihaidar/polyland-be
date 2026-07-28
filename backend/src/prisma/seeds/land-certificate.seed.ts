import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client/extension";
import {
  CertificateStatus,
  CertificateType,
} from "../../generated/prisma/enums.js";
import {
  generateNIB,
  generateUniqueCode,
  buildCertificatePDFForTesting,
} from "../../services/certificate.service.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_PATH = path.join(__dirname, "../../../../.env");

// Folder output PDF hasil testing
const OUTPUT_DIR = path.join(__dirname, "../../../../seed-output/certificates");

const PDF_LIMIT_PER_REGION = 5;

export const landCertificateModule = async (prisma: PrismaClient) => {
  try {
    let PERSON_ID = process.env.ADMIN_LAND;

    if (!PERSON_ID) {
      console.log("⏳ ADMIN_LAND belum ada, register dulu...");

      const response = await fetch(`${process.env.BE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "user pertanahan",
          username: "user",
          email: "user@gmail.com",
          password: "user123.",
          confirmPassword: "user123.",
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

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

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

    const MAX_RETRY = 3;

    const createOneLandWithCert = async (
      villages: any[],
      shouldGeneratePdf: boolean,
    ) => {
      const v = villages[Math.floor(Math.random() * villages.length)];
      const provinceCode = Number(v.district.regency.province.code);
      const regencyCode = Number(v.district.regency.code);
      const districtCode = Number(v.district.code);

      let lastError: unknown;

      for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
        try {
          const code = generateUniqueCode(6);
          const nib = await generateNIB(
            provinceCode,
            regencyCode,
            districtCode,
            v.code,
          );

          const land = await prisma.land.create({
            data: {
              area_size: Number(randomArea()),
              street_address: randomAddress(),
              rt: randomRT(),
              rw: randomRW(),
              province_code: provinceCode,
              regency_code: regencyCode,
              district_code: Number(v.district.code),
              village_code: String(v.code),
              certificates: {
                create: {
                  nib,
                  code,
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
            include: {
              province: true,
              regency: true,
              district: true,
              village: true,
              certificates: {
                include: {
                  owners: { include: { person: true } },
                },
              },
            },
          });

          // --- Generate PDF mentah untuk testing (no blockchain) ---
          if (shouldGeneratePdf) {
            try {
              const certificate = land.certificates[0];

              const pdfBuffer = await buildCertificatePDFForTesting({
                code,
                nib,
                type: CertificateType.SHM,
                land,
                owners: certificate.owners,
              });

              fs.writeFileSync(path.join(OUTPUT_DIR, `${code}.pdf`), pdfBuffer);

              console.log(`📄 PDF dibuat: ${code}.pdf`);
            } catch (pdfError) {
              // Jangan sampai kegagalan generate PDF menggagalkan seeding data
              console.warn(`⚠️ Gagal generate PDF untuk ${code}:`, pdfError);
            }
          }

          return;
        } catch (err: any) {
          lastError = err;
          if (err?.code === "P2002") {
            console.warn(
              `⚠️ Bentrok unique constraint untuk ${provinceCode}-${regencyCode}, retry (attempt ${attempt + 1})...`,
            );
            continue;
          }

          throw err;
        }
      }

      throw lastError;
    };

    const createLandWithCert = async (
      villages: any[],
      total: number,
      label: string,
    ) => {
      for (let i = 1; i <= total; i++) {
        const shouldGeneratePdf = i <= PDF_LIMIT_PER_REGION;
        await createOneLandWithCert(villages, shouldGeneratePdf);

        if (i % 10 === 0 || i === total) {
          console.log(`⏳ ${label}: ${i}/${total} selesai`);
        }
      }
    };

    await createLandWithCert(surabayaVillages, 150, "Surabaya");
    console.log("✅ Surabaya done (150 certificates)");

    await createLandWithCert(jemberVillages, 150, "Jember");
    console.log("✅ Jember done (150 certificates)");

    console.log(
      `🎉 Seed land + certificate selesai — total 300 data, ${PDF_LIMIT_PER_REGION * 2} PDF digenerate di ${OUTPUT_DIR}`,
    );
  } catch (err) {
    console.error("❌ Error seed land:", err);
    process.exit(1);
  }
};
