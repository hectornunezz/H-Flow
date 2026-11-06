import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  hflowPrisma?: PrismaClient;
};

export const prisma = globalForPrisma.hflowPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.hflowPrisma = prisma;
}
