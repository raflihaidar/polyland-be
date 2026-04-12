import { Person } from "../person.type";

export interface OfficerCreate extends Person {
    nip: string
    digitalSignature: string
}