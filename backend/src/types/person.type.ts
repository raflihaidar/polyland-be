import { Role } from "./role.type.js";
import { Gender } from "../generated/prisma/enums.js";

export interface Person {
  id: string;
  name: string;
  wallet_address: string;
  username: string;
  password: string;
  email: string;
  nonce: string;
  nik: string;
  address: string;
  phone: string;
  roles: Role[];
}

export interface UpdatePerson {
  name?: string;
  nik?: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  address?: string;
  nip?: string;
  landOfficeId?: string;
  roles?: number[];
}
