import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const tasks = await prisma.task.findMany();
      res.status(200).json({ tasks });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  } else if (req.method === 'POST') {
    try {
      const { title } = req.body;
      const task = await prisma.task.create({
        data: {
          title,
        },
      });
      res.status(201).json({ task });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to create task' });
    }
  } else {
    res.status(405).end();
  }
};