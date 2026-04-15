import { CertificateType } from "../../generated/prisma/client";

export interface Application {
  
}

interface ApplicationOwnerInput {
  person_id: string
  sharePercent?: number
}

export interface ApplicationCreate {
  person_id: string;
  land_id?: string;
  land_office_id : string

  // Land
  area_size : string
  street_address?: string;
  rt?: string;
  rw?: string;
  ward?: string;
  subdistrict?: string;
  regency?: string;
  province?: string;
  province_code : number;
  regency_code : number;

  // Certificate
  cert_number: string;
  cert_type: CertificateType;
  nib : string;

  // Dokumen
  cert_file: Express.Multer.File;
  ktp_penjual: Express.Multer.File;
  kk_pembeli: Express.Multer.File;
  ktp_pembeli: Express.Multer.File;
  akta_jual_beli: Express.Multer.File;
  fc_sppt: Express.Multer.File;
  fc_pbb: Express.Multer.File;
  ssb: Express.Multer.File;

  // Application Owner
  owners: ApplicationOwnerInput[]
}
