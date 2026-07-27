import { CertificateType } from "../../generated/prisma/enums.js";

interface ApplicationOwnerInput {
  person_id: string;
  share?: number;
}

interface ApplicationSellerInput {
  person_id: string;
  share?: number;
}

interface PersonFile {
  file: Express.Multer.File;
  person_id: string;
}

export interface ApplicationCreate {
  person_id?: string;

  land_id: string;
  land_office_id: string;
  officer_id?: string;

  cert_code: string;
  cert_type: CertificateType;
  nib: string;

  ktp_pembeli: PersonFile[];
  kk_pembeli: PersonFile[];
  npwp_pembeli: PersonFile[];
  surat_nikah_pembeli: PersonFile[];
  ktp_penjual: PersonFile[];
  kk_penjual: PersonFile[];
  npwp_penjual: PersonFile[];
  surat_nikah_penjual: PersonFile[];

  akta_jual_beli: Express.Multer.File;
  sppt_pbb: Express.Multer.File;
  bphtb: Express.Multer.File;
  pph: Express.Multer.File;

  owners: ApplicationOwnerInput[];
  sellers: ApplicationSellerInput[];
}

export interface ApplicationUpdate {
  person_id?: string;

  land_id: string;
  land_office_id: string;
  officer_id?: string;

  cert_code: string;
  cert_type: CertificateType;
  nib: string;

  ktp_pembeli: PersonFile[];
  kk_pembeli: PersonFile[];
  npwp_pembeli: PersonFile[];
  surat_nikah_pembeli: PersonFile[];
  ktp_penjual: PersonFile[];
  kk_penjual: PersonFile[];
  npwp_penjual: PersonFile[];
  surat_nikah_penjual: PersonFile[];

  akta_jual_beli: Express.Multer.File;
  sppt_pbb: Express.Multer.File;
  bphtb: Express.Multer.File;
  pph: Express.Multer.File;

  owners: ApplicationOwnerInput[];
  sellers: ApplicationSellerInput[];
}
