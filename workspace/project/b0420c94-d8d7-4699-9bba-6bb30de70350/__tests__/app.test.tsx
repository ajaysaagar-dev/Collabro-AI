// apps/web/src/app/layout.tsx
import React from 'react';
import { useSession } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { useMemo } from 'react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const Layout: React.FC = () => {
  const { data: session, status } = useSession();

  return (
    <SessionProvider>
      {status === 'loading' && <div>Loading...</div>}
      {status === 'authenticated' && (
        <div>
          {/* Your layout content here */}
        </div>
      )}
    </SessionProvider>
  );
};

export default Layout;

// apps/web/src/app/page.tsx
import { useState, useEffect } from 'react';
import Layout from '../app/layout';
import TodoList from '../modules/todo/presentation/todo-list';
import { TodoListProps } from '../modules/todo/presentation/todo-list';

const Page: React.FC = () => {
  const [todos, setTodos] = useState<TodoListProps[]>([]);

  useEffect(() => {
    // Fetch todos from your API or database
    // ...
  }, []);

  return (
    <Layout>
      <TodoList todos={todos} />
    </Layout>
  );
};

export default Page;

// apps/web/src/app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
  }
}

// apps/web/src/modules/todo/domain/todo.ts
import { z } from 'zod';

export enum TodoPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

export enum TodoStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate: Date;
  priority: number;
}

export interface CreateTodoInput {
  title: string;
  dueDate?: Date | null;
  priority?: number;
}

export interface TodoUpdateInput {
  title?: string;
  dueDate?: Date | null;
  priority?: number;
}

export interface TodoFilter {
  title?: string;
  completed?: boolean;
  dueDate?: Date;
  priority?: number;
}

// apps/web/src/modules/todo/presentation/todo-list.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TodoService } from '@/modules/todo/application/todo-service';

interface Todo {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  dueDate?: Date | null;
  priority?: 'low' | 'medium' | 'high';
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const todoService = new TodoService();

  useEffect(() => {
    todoService.fetchTodos().then((todos) => setTodos(todos));
  }, []);

  const handleTodoClick = useCallback((todo: Todo) => {
    // Handle todo click here
  }, []);

  return (
    <ul>
      {todos.map((todo) => (
        <li