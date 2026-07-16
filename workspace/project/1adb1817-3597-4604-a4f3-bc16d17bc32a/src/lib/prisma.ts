import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  })
}

const prisma = globalThis.prisma || createPrismaClient()

if (process.env.NODE_ENV === 'development') {
  globalThis.prisma = prisma
}

export { prisma }