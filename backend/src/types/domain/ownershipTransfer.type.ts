import { CertificateType } from "../../generated/prisma/enums.js";

interface ApplicationOwnerInput {
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

  cert_file: Express.Multer.File;
  akta_jual_beli: Express.Multer.File;

  ktp_pembeli: PersonFile[];
  kk_pembeli: PersonFile[];
  ktp_penjual: PersonFile[];

  fc_sppt: Express.Multer.File;
  fc_pbb: Express.Multer.File;
  ssb: Express.Multer.File;

  owners: ApplicationOwnerInput[];
}

export interface ApplicationUpdate {
  person_id?: string;

  land_id?: string;
  land_office_id?: string;
  officer_id?: string;
  cert_code?: string;
  cert_type?: CertificateType;
  nib?: string;

  cert_file?: Express.Multer.File;
  akta_jual_beli?: Express.Multer.File;
  ktp_pembeli?: PersonFile[];
  kk_pembeli?: PersonFile[];
  ktp_penjual?: PersonFile[];
  fc_sppt?: Express.Multer.File;
  fc_pbb?: Express.Multer.File;
  ssb?: Express.Multer.File;

  owners: ApplicationOwnerInput[];
}
