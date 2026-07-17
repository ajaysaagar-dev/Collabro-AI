// domains/todo/domain.ts

export enum TodoPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

export enum TodoStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate: Date;
  priority: TodoPriority;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoList {
  id: string;
  name: string;
  todos: Todo[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoFilter {
  status: TodoStatus;
  dueDateFrom: Date;
  dueDateTo: Date;
}

export interface TodoSearch {
  query: string;
  limit: number;
  offset: number;
}