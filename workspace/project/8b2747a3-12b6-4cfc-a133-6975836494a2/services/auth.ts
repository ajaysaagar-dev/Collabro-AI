import { NextApiRequest, NextApiResponse } from 'next';
import { NextAuthOptions } from 'next-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const authOptions: NextAuthOptions = {
  providers: [
    // ... your other providers
  ],
  secret: process.env.NEXTAUTH_SECRET,
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const button = await prisma.button.findUnique({
        where: {
          id: 1,
        },
      });
      res.status(200).json({ button });
    } else if (req.method === 'POST') {
      // ... your logic for handling POST requests
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}