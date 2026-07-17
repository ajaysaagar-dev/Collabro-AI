import { NextApiRequest, NextApiResponse } from 'next';
import { Button } from '../domain/Button';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ButtonColorUpdateRequest {
  color: string;
}

export const POST = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { color } = req.body as ButtonColorUpdateRequest;

    if (!color) {
      return res.status(400).json({ error: 'Color is required' });
    }

    const button = await prisma.button.update({
      where: { id: req.query.id as string },
      data: { color },
    });

    return res.status(200).json({ message: 'Button color updated successfully', button });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update button color' });
  }
};