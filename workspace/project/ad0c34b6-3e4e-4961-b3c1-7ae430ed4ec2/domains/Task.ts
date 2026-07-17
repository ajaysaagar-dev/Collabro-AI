import { z } from 'zod';

/**
 * Task status enum for tracking completion state
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

/**
 * Task priority levels for organizing tasks
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Validation schema for creating a new task
 */
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  dueDate: z.date().refine((date) => date > new Date(), {
    message: 'Due date must be in the future',
  }),
  priority: z.enum(TaskPriority).default(TaskPriority.MEDIUM),
  tags: z.array(z.string().uuid()).optional(),
  assigneeId: z.string().uuid().optional(),
});

/**
 * Validation schema for updating an existing task
 */
export const UpdateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  completed: z.boolean().optional(),
  priority: z.enum(TaskPriority).optional(),
  tags: z.array(z.string().uuid()).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
});

/**
 * Validation schema for task query parameters (filtering and sorting)
 */
export const TaskQuerySchema = z.object({
  search: z.string().optional(),
  completed: z.boolean().optional(),
  priority: z.enum(TaskPriority).optional(),
  tag: z.string().uuid().optional(),
  sortBy: z.enum('dueDate', 'createdAt', 'priority', 'title').default('dueDate'),
  sortOrder: z.enum('asc', 'desc').default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

/**
 * Task data interface representing the database model
 */
export interface TaskData {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  dueDate: Date;
  priority: TaskPriority;
  tags: string[];
  assigneeId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task creation input type
 */
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

/**
 * Task update input type
 */
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

/**
 * Task query parameters type
 */
export type TaskQueryParams = z.infer<typeof TaskQuerySchema>;

/**
 * Validates task creation data
 * @param data - The task data to validate
 * @returns The validated and transformed data
 */
export function validateCreateTask(data: unknown): CreateTaskInput {
  return CreateTaskSchema.parse(data);
}

/**
 * Validates task update data
 * @param data - The task data to validate
 * @returns The validated and transformed data
 */
export function validateUpdateTask(data: unknown): UpdateTaskInput {
  return UpdateTaskSchema.parse(data);
}

/**
 * Validates task query parameters
 * @param data - The query parameters to validate
 * @returns The validated and transformed data
 */
export function validateTaskQuery(data: unknown): TaskQueryParams {
  return TaskQuerySchema.parse(data);
}