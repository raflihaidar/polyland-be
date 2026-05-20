import { Person } from "../person.type.js";

export interface OfficerCreate extends Person {
  nip: string;
  digitalSignature: string;
  birthPlace: string;
  birthDate: Date;
  gender: "LAKI_LAKI" | "PEREMPUAN";
  land_office_id: string;
}
