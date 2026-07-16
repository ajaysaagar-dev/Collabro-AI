import { PrismaClient } from '@prisma/client';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient as Prisma } from '@prisma/client';
import { PrismaAdapter as PrismaAdapterInstance } from '@auth/prisma-adapter';

declare global {
  // allow global `var` for PrismaClient to avoid multiple instances in development
  // eslint-disable-next-line no-undef
  var prisma: Prisma | undefined;
}

let prisma: Prisma | undefined;

if (process.env.NODE_ENV === 'production') {
  prisma = new Prisma();
} else {
  // check if prisma is already defined in global scope to avoid multiple instances
  if (!global.prisma) {
    global.prisma = new PrismaAdapterInstance();
  }
  prisma = global.prisma;
}

export default prisma;