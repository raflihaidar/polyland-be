import { Gender, VerificationStatus } from "../../generated/prisma/client";

export interface VerificationAccountCreate {
  person_id: string;
  fullName: string;
  nik: string;
  phone: string;
  birthPlace: string;
  birthDate: Date;
  gender: Gender;
  address: string;
}

export interface VerificationAccountUpdate {
  id: string;
  status: VerificationStatus;
  rejectionReason?: string;
}
