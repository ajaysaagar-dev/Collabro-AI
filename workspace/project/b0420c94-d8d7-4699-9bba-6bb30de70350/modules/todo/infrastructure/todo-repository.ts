// modules/todo/infrastructure/todo-repository.ts

import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { env } from 'process';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'stdout',
      level: 'info',
    },
  ],
});

const TodoRepository = {
  async createTodo(req: NextApiRequest, res: NextApiResponse) {
    try {
      const { title, dueDate, priority } = req.json();
      const todo = await prisma.todo.create({
        data: {
          title,
          dueDate: new Date(dueDate),
          priority,
        },
      });
      return NextApiResponse.json(todo, { status: 201 });
    } catch (error) {
      console.error(error);
      return NextApiResponse.status(500).json({ message: 'Failed to create todo' });
    }
  },

  async getTodos(req: NextApiRequest, res: NextApiResponse) {
    try {
      const todos = await prisma.todo.findMany();
      return NextApiResponse.json(todos);
    } catch (error) {
      console.error(error);
      return NextApiResponse.status(500).json({ message: 'Failed to retrieve todos' });
    }
  },

  async getTodo(req: NextApiRequest, res: NextApiResponse) {
    try {
      const id = req.params.id;
      const todo = await prisma.todo.findUnique({ where: { id } });
      if (!todo) {
        return NextApiResponse.status(404).json({ message: 'Todo not found' });
      }
      return NextApiResponse.json(todo);
    } catch (error) {
      console.error(error);
      return NextApiResponse.status(500).json({ message: 'Failed to retrieve todo' });
    }
  },

  async updateTodo(req: NextApiRequest, res: NextApiResponse) {
    try {
      const id = req.params.id;
      const { title, dueDate, priority, completed } = req.json();
      const todo = await prisma.todo.update({
        where: { id },
        data: {
          title,
          dueDate: new Date(dueDate),
          priority,
          completed,
        },
      });
      return NextApiResponse.json(todo);
    } catch (error) {
      console.error(error);
      return NextApiResponse.status(500).json({ message: 'Failed to update todo' });
    }
  },

  async deleteTodo(req: NextApiRequest, res: NextApiResponse) {
    try {
      const id = req.params.id;
      await prisma.todo.delete({ where: { id } });
      return NextApiResponse.status(204).json();
    } catch (error) {
      console.error(error);
      return NextApiResponse.status(500).json({ message: 'Failed to delete todo' });
    }
  },
};

export { TodoRepository };