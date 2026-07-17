import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class AuthService {
  async register(email: string, password: string): Promise<{ id: string; email: string }> {
    const hashedPassword = await this.hashPassword(password)
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
      },
    })

    return user
  }

  async login(email: string, password: string): Promise<{ id: string; email: string } | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
      },
    })

    if (!user) {
      return null
    }

    const isValidPassword = await this.verifyPassword(password, user.password)

    if (!isValidPassword) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
    }
  }

  async getUserById(id: string): Promise<{ id: string; email: string } | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
      },
    })

    return user
  }

  async getUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    })

    return user
  }

  async updateUserProfile(userId: string, email: string): Promise<{ id: string; email: string }> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { email },
      select: {
        id: true,
        email: true,
      },
    })

    return user
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt')
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const bcrypt = await import('bcrypt')
    return bcrypt.compare(password, hashedPassword)
  }
}

export const authService = new AuthService()