import { Task } from '../../domains/Task';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TaskService {
  async getAllTasks(): Promise<Task[]> {
    const tasks = await prisma.task.findMany({
      orderBy: {
        dueDate: 'asc'
      }
    });
    return tasks;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const task = await prisma.task.findUnique({
      where: { id }
    });
    return task;
  }

  async createTask(data: {
    title: string;
    completed?: boolean;
    dueDate: Date;
  }): Promise<Task> {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        completed: data.completed ?? false,
        dueDate: data.dueDate
      }
    });
    return task;
  }

  async updateTask(id: string, data: {
    title?: string;
    completed?: boolean;
    dueDate?: Date;
  }): Promise<Task | null> {
    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        completed: data.completed,
        dueDate: data.dueDate
      }
    });
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      await prisma.task.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}