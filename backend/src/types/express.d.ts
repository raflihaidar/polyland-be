import { AuthPerson } from "../types/auth.type";

declare global {
  namespace Express {
    interface Request {
      person: AuthPerson | null;
    }
  }
}

export {};
