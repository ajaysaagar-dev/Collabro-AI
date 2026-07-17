import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Todo {
  id: string;
  title: string;
  userId: string;
}

export class TodoRepository {
  async createTodo(todo: Todo): Promise<Todo> {
    const createdTodo = await prisma.task.create({
      data: {
        title: todo.title,
        userId: todo.userId,
      },
    });
    return createdTodo;
  }

  async getTodosByUserId(userId: string): Promise<Todo[]> {
    const todos = await prisma.task.findMany({
      where: { userId },
    });
    return todos;
  }
}