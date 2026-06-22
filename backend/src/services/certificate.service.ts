import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/error.js";
import { publicClient } from "../config/wallet.js";
import { contractConfig } from "../config/wallet.js";

export const searchCertificate = async (search: string) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: {
        OR: [
          {
            nib: search,
          },
          {
            code: search,
          },
        ],
      },
      select: {
        id: true,
        nib: true,
        type: true,
        status: true,
        code: true,
        land: {
          select: {
            id: true,
            area_size: true,
            street_address: true,
            rt: true,
            rw: true,
            province: {
              select: {
                name: true,
              },
            },
            regency: {
              select: {
                name: true,
              },
            },
            district: {
              select: {
                name: true,
              },
            },
            village: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return certificates;
  } catch (error: any) {
    throw new AppError("Terjadi kesalahan saat mencari data", 500, error?.meta);
  }
};

export const getCertificates = async (person_id: string) => {
  try {
    const certificates = await prisma.certificate.findMany({
      where: {
        owners: {
          some: {
            person_id,
          },
        },
        status: "AKTIF",
      },
      select: {
        owners: {
          select: {
            person: {
              select: {
                name: true,
              },
            },
          },
        },
        id: true,
        code: true,
        nib: true,
        type: true,
        status: true,
        label: true,
        land: {
          select: {
            province: {
              select: {
                name: true,
              },
            },
            regency: {
              select: {
                name: true,
              },
            },
            district: {
              select: {
                name: true,
              },
            },
            village: {
              select: {
                name: true,
              },
            },
            rt: true,
            rw: true,
          },
        },
      },
    });

    let result = certificates.map((item: any) => {
      return {
        id: item.id,
        owners: item.owners.map((owner: any) => owner.person.name),
        nib: item.nib,
        code: item.code,
        type: item.type,
        status: item.status,
        label: item.label,
        address: {
          province: item.land.province.name,
          regency: item.land.regency.name,
          district: item.land.district.name,
          village: item.land.village.name,
          rt: item.land.rt,
          rw: item.land.rw,
        },
      };
    });

    return result;
  } catch (err: any) {
    new AppError("Gagal mendapatkan sertifikat", 500, err.meta);
  }
};

export const getCertificateById = async (
  person_id: string,
  certificate_id: string,
) => {
  try {
    const data = await prisma.certificateOwner.findUnique({
      where: {
        certificate_id_person_id: {
          person_id,
          certificate_id,
        },
      },
      include: {
        person: {
          select: {
            name: true,
          },
        },
        certificate: {
          select: {
            id: true,
            code: true,
            nib: true,
            type: true,
            status: true,
            cid: true,
            owners: {
              select: {
                ownership_pct: true,
                person: {
                  select: { name: true },
                },
              },
            },
            land: {
              select: {
                province: { select: { name: true } },
                regency: { select: { name: true } },
                district: { select: { name: true } },
                village: { select: { name: true } },
                rt: true,
                rw: true,
              },
            },
          },
        },
      },
    });

    if (!data) return null;

    const result = {
      id: data.certificate.id,
      code: data.certificate.code,
      nib: data.certificate.nib,
      type: data.certificate.type,
      status: data.certificate.status,
      cid: data.certificate.cid,

      owners: data.certificate.owners.map((owner: any) => ({
        name: owner.person?.name,
        ownership: owner.ownership_pct,
      })),

      address: {
        province: data.certificate.land.province.name,
        regency: data.certificate.land.regency.name,
        district: data.certificate.land.district.name,
        village: data.certificate.land.village.name,
        rt: data.certificate.land.rt,
        rw: data.certificate.land.rw,
      },
    };

    return result;
  } catch (err: any) {
    throw new AppError("Gagal mendapatkan sertifikat", 500, err.meta);
  }
};

// export const updatePaymentStatus = async (
//   application_id: string,
//   status: PaymentStatus,
// ) => {
//   try {
//     if (!application_id || !status) {
//       throw new AppError("application_id dan status wajib diisi", 400);
//     }

//     const paymentStatus = await prisma.certificate.update({
//       where: { application_id },
//       data: { payment_status: status },
//       select: {
//         payment_status: true,
//       },
//     });

//     return paymentStatus;
//   } catch (err: any) {
//     if (err instanceof AppError) {
//       throw err;
//     }
//     throw new AppError(
//       "Gagal memperbarui status pembayaran sertifikat",
//       500,
//       err.meta,
//     );
//   }
// };

export const verifyCertificate = async (tokenId: number) => {
  // ─── 1. Call smart contract isVerified ────────────────────────────────
  let isVerified: boolean;

  try {
    // const contract = getContract();
    // isVerified = await contract.isVerified(tokenId);

    isVerified = (await publicClient.readContract({
      ...contractConfig,
      functionName: "isVerified",
      args: [BigInt(tokenId)],
    } as any)) as boolean;
  } catch (error) {
    throw new AppError("Gagal melakukan verifikasi ke blockchain", 502);
  }

  if (!isVerified) {
    throw new AppError("Sertifikat tidak valid atau telah dicabut", 403);
  }

  // ─── 2. Ambil data sertifikat dari DB ──────────────────────────────────
  const certificate = await prisma.certificate.findFirst({
    where: { token_id: tokenId },
    include: {
      land: {
        include: {
          province: true,
          regency: true,
          district: true,
          village: true,
        },
      },
      owners: {
        include: {
          person: true,
        },
      },
      notes: {
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!certificate) {
    throw new AppError("Data sertifikat tidak ditemukan", 404);
  }

  // ─── 3. Susun response ─────────────────────────────────────────────────
  return {
    isVerified: true,
    certificate: {
      id: certificate.id,
      code: certificate.code,
      nib: certificate.nib,
      type: certificate.type,
      status: certificate.status,
      token_id: certificate.token_id,
      tx_hash: certificate.tx_hash,
      hash: certificate.hash,
      cid: certificate.cid,
      createdAt: certificate.createdAt,
      land: {
        area_size: certificate.land.area_size,
        street_address: certificate.land.street_address,
        village: certificate.land.village.name,
        district: certificate.land.district.name,
        regency: certificate.land.regency.name,
        province: certificate.land.province.name,
      },
      owners: certificate.owners.map((o: any) => ({
        name: o.person.name,
        nik: o.person.nik,
        share: o.ownership_pct,
      })),
      notes: certificate.notes.map((n: any) => n.note),
    },
  };
};

export const updateLabelCertificate = async (id: string, label: string) => {
  try {
    const certificate = await prisma.certificate.update({
      where: {
        id,
      },
      data: {
        label: label,
      },
    });

    return certificate;
  } catch (error: any) {
    throw new AppError("Update data sertifikat gagal", 500, error?.meta);
  }
};
