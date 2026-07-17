// modules/todo/application/todo-service.ts

import { Todo } from '../domains/todo/domain';
import { PrismaClient } from '@prisma/client';
import { NextAuth } from 'next-auth';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export class TodoService {
  async createTodo(title: string, dueDate: string, priority: number): Promise<Todo> {
    try {
      const newTodo = await prisma.todo.create({
        data: {
          title,
          completed: false,
          dueDate: new Date(dueDate),
          priority,
        },
      });
      return newTodo;
    } catch (error) {
      throw new Error('Failed to create todo');
    }
  }

  async getTodos(): Promise<Todo[]> {
    try {
      const todos = await prisma.todo.findMany();
      return todos;
    } catch (error) {
      throw new Error('Failed to retrieve todos');
    }
  }

  async getTodo(id: string): Promise<Todo | null> {
    try {
      const todo = await prisma.todo.findUnique({
        where: { id },
      });
      return todo;
    } catch (error) {
      throw new Error('Failed to retrieve todo');
    }
  }

  async updateTodo(id: string, title: string, dueDate: string, priority: number): Promise<Todo> {
    try {
      const updatedTodo = await prisma.todo.update({
        where: { id },
        data: {
          title,
          completed: false,
          dueDate: new Date(dueDate),
          priority,
        },
      });
      return updatedTodo;
    } catch (error) {
      throw new Error('Failed to update todo');
    }
  }

  async deleteTodo(id: string): Promise<void> {
    try {
      await prisma.todo.delete({ where: { id } });
    } catch (error) {
      throw new Error('Failed to delete todo');
    }
  }
}