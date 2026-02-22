import { CertificateType } from "../../generated/prisma/client";

export interface ApplicationCreate {
  person_id: string;
  land_id?: string;

  // Land
  street_address?: string;
  rt?: string;
  rw?: string;
  ward?: string;
  subdistrict?: string;
  regency?: string;
  province?: string;

  // Certificate
  cert_number: string;
  cert_type: CertificateType;

  // Dokumen
  cert_file: Express.Multer.File;
  ktp_penjual: Express.Multer.File;
  kk_pembeli: Express.Multer.File;
  ktp_pembeli: Express.Multer.File;
  akta_jual_beli: Express.Multer.File;
  fc_sppt: Express.Multer.File;
  fc_pbb: Express.Multer.File;
}
