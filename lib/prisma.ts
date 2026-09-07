import { PrismaClient } from "@prisma/client";

// Один клиент на процесс: в dev-режиме Next пересоздаёт модули при hot reload,
// и без этого кэша соединения к базе накапливаются.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
