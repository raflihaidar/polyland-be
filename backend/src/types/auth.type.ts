export interface RegisterRequest {
  name: string;
  username: string;
  email: string;
  password: string;
}

export type AuthPerson = {
  id: string;
  roles: string[];
};
