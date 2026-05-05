import { prisma } from "../config/prisma";

const searchPersonByNik = async (nik: string) => {
  const person = await prisma.person.findUnique({
    where: {
      nik,
    },
    select: {},
  });
};
