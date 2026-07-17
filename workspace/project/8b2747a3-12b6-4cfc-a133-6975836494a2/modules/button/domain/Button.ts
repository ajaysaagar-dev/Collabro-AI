import { PrismaClient } from '@prisma/client';

interface ButtonState {
  color: string;
}

class Button {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async updateButtonColor(color: string): Promise<void> {
    try {
      await this.prisma.button.update({
        where: { id: 1 },
        data: { color },
      });
    } catch (error) {
      console.error('Error updating button color:', error);
    }
  }

  async getButtonColor(): Promise<string> {
    try {
      const button = await this.prisma.button.findUnique({
        where: { id: 1 },
      });
      return button.color;
    } catch (error) {
      console.error('Error getting button color:', error);
      throw error;
    }
  }
}

export default Button;