import { Role } from "./role.type";

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
