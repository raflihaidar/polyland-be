export interface CreateLandOfficeInput {
  name: string;
  code: string;
  province: string;
  regency: string;

  address?: string;
  phone?: string;
  email?: string;
};

export interface UpdateLandOfficeInput {
  name?: string;
  code?: string;
  province?: string;
  regency?: string;

  address?: string;
  phone?: string;
  email?: string;
};
