import {
  CertificateStatus,
  CertificateType,
} from "../../generated/prisma/enums.js";

export interface CertificateCreate {
  old_code: string;
  nib: string;
  code: string;
  land_id: string;
  application_id: string;
  cid?: string;
  status: CertificateStatus;
  type: CertificateType;
  hash?: string;
  notes: string[];
  owners: any[];
}
