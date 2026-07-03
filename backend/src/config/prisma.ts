import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = `${process.env.DATABASE_URL}`;


const pool = new Pool({
  connectionString,
  max: 10,
});

const adapter = new PrismaPg(pool);

const basePrisma = new PrismaClient({ adapter });

const prisma = basePrisma.$extends({
  query: {
    person: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findUnique({ args, query }) {
        args.where = { ...args.where, deletedAt: null } as any;
        return query(args);
      },
    },
  },
});

export { prisma };
