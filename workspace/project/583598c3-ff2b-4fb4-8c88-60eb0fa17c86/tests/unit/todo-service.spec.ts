import { PrismaClient } from '@prisma/client';
import { TodoService } from '../application/todo-service';
import { Todo } from '../models/todo';
import { User } from '../models/user';

const prisma = new PrismaClient();

describe('TodoService', () => {
  let todoService: TodoService;

  beforeEach(async () => {
    todoService = new TodoService(prisma);
  });

  it('should create a new todo', async () => {
    const newTodo = {
      title: 'New Task',
      userId: 'user123',
    };
    const createdTodo = await todoService.createTodo(newTodo);
    expect(createdTodo).toEqual({
      id: expect.any(String),
      title: 'New Task',
      userId: 'user123',
    });
  });

  it('should get all todos', async () => {
    const todos = await todoService.getTodos();
    expect(todos).toEqual([]);
  });

  it('should get a todo by id', async () => {
    const todo = await todoService.getTodo('123');
    expect(todo).toEqual({
      id: '123',
      title: 'Task Title',
      userId: 'user123',
    });
  });

  it('should update a todo', async () => {
    const updatedTodo = await todoService.updateTodo('123', {
      title: 'Updated Task',
    });
    expect(updatedTodo).toEqual({
      id: '123',
      title: 'Updated Task',
    });
  });

  it('should delete a todo', async () => {
    const deletedTodo = await todoService.deleteTodo('123');
    expect(deletedTodo).toEqual({
      id: '123',
    });
  });
});