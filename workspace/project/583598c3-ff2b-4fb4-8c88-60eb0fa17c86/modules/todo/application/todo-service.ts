// modules/todo/application/todo-service.ts

import { PrismaClient } from '@prisma/client';
import { User } from '../domains/user';
import { Task } from '../domains/task';
import { TaskStatus } from '../domains/enums/task-status';
import { TaskPriority } from '../domains/enums/task-priority';

const prisma = new PrismaClient();

interface CreateTaskInput {
  title: string;
  userId: string;
  dueDate?: Date;
  priority?: TaskPriority;
  status?: TaskStatus;
}

interface UpdateTaskInput {
  id: string;
  title?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  status?: TaskStatus;
}

interface DeleteTaskInput {
  id: string;
}

class TodoService {
  async getAllTasks(): Promise<Task[]> {
    try {
      const tasks = await prisma.task.findMany({
        include: {
          user: true,
        },
      });
      return tasks;
    } catch (error) {
      throw new Error('Failed to retrieve tasks');
    }
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    try {
      const task = await prisma.task.create({
        data: {
          title: input.title,
          userId: input.userId,
          dueDate: input.dueDate,
          priority: input.priority,
          status: input.status,
        },
      });
      return task;
    } catch (error) {
      throw new Error('Failed to create task');
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const task = await prisma.task.findUnique({
        where: { id },
        include: {
          user: true,
        },
      });
      return task;
    } catch (error) {
      throw new Error('Failed to retrieve task');
    }
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    try {
      const task = await prisma.task.update({
        where: { id: input.id },
        data: {
          title: input.title,
          dueDate: input.dueDate,
          priority: input.priority,
          status: input.status,
        },
      });
      return task;
    } catch (error) {
      throw new Error('Failed to update task');
    }
  }

  async deleteTask(input: DeleteTaskInput): Promise<void> {
    try {
      await prisma.task.delete({
        where: { id: input.id },
      });
    } catch (error) {
      throw new Error('Failed to delete task');
    }
  }
}

export default TodoService;