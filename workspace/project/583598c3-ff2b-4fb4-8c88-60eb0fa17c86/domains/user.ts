// domains/user.ts
import { AuthError } from 'domains/auth';

interface User {
  id: string;
  email: string;
  password: string;
}

class UserManager {
  private users: User[];

  constructor() {
    this.users = [];
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) || null;
  }

  async createUser(email: string, password: string): Promise<User> {
    if (await this.getUserByEmail(email)) {
      throw new AuthError('Email already exists');
    }

    const user: User = {
      id: cuid(),
      email,
      password,
    };

    this.users.push(user);

    return user;
  }

  async updateUser(id: string, email: string, password: string): Promise<User> {
    const user = this.users.find((user) => user.id === id);

    if (!user) {
      throw new Error('User not found');
    }

    user.email = email;
    user.password = password;

    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const index = this.users.findIndex((user) => user.id === id);

    if (index === -1) {
      throw new Error('User not found');
    }

    this.users.splice(index, 1);
  }
}

const userManager = new UserManager();

export { userManager, UserManager };
```

```typescript
// domains/auth.ts
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export { AuthError };