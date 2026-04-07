import { CertificateStatus, CertificateType } from "../../generated/prisma/enums";

export interface CertificateCreate {
    nib : string;
    code : string;
    land_id : string;
    owner_id : string;
    cid? : string;
    status : CertificateStatus;
    type : CertificateType;
    hash : string;
}