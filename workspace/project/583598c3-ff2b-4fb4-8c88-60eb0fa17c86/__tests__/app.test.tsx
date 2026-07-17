// tests/unit/todo-service.spec.ts
import { PrismaClient } from '@prisma/client';
import { TodoService } from '../application/todo-service';
import { Todo } from '../prisma/model/Todo';
import { User } from '../prisma/model/User';
import { NextResponse } from 'next/server';
import { Request, Response } from 'express';

const prisma = new PrismaClient();
const todoService = new TodoService(prisma);

describe('TodoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new todo', async () => {
    const newTodo = {
      title: 'New Todo',
      userId: 'user123',
      description: 'This is a new todo',
      priority: 'high',
    };

    const createdTodo = await todoService.createTodo(newTodo);
    expect(createdTodo).toEqual(newTodo);
  });

  it('should get all todos', async () => {
    const todos = await todoService.getAllTodos();
    expect(todos).toEqual([]);
  }
});
```

```javascript
// tests/integration/todo-repository.spec.ts
import { PrismaClient } from '@prisma/client';
import { TodoRepository } from '../infrastructure/todo-repository';
import { Todo } from '../prisma/model/Todo';
import { User } from '../prisma/model/User';
import { NextResponse } from 'next/server';
import { Request, Response } from 'express';

const prisma = new PrismaClient();
const todoRepository = new TodoRepository(prisma);

describe('TodoRepository', () => {
  it('should create a new todo', async () => {
    const newTodo = {
      title: 'New Todo',
      userId: 'user123',
      description: 'This is a new todo',
      priority: 'high',
    };

    const createdTodo = await todoRepository.createTodo(newTodo);
    expect(createdTodo).toEqual(newTodo);
  });

  it('should get all todos', async () => {
    const todos = await todoRepository.getAllTodos();
    expect(todos).toEqual([]);
  });
});
```

```javascript
// tests/integration/auth.spec.ts
import { PrismaClient } from '@prisma/client';
import { Auth } from '../domains/auth';

const prisma = new PrismaClient();
const auth = new Auth(prisma);

describe('Auth', () => {
  it('should authenticate a user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'password',
      },
    });

    const token = await auth.authenticate(user.email, 'password');
    expect(token).toBeDefined();
  });
});
```

```javascript
// tests/integration/notification.spec.ts
import { PrismaClient } from '@prisma/client';
import { Notification } from '../domains/notification';
import { NotificationService } from '../services/notification';

const prisma = new PrismaClient();
const notificationService = new NotificationService(prisma);

describe('NotificationService', () => {
  it('should send a notification', async () => {
    const notification = {
      channel: 'email',
      message: 'This is a test