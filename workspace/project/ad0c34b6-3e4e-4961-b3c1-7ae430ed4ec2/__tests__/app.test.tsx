// apps/web/src/app/layout.tsx
import { useState } from 'react';
import { useClient } from 'next/client';
import { useTasks } from '../modules/task/presentation/TaskSlice';
import { TaskList } from '../modules/task/presentation/TaskList';
import { Task } from '../modules/task/domain/Task';

const Page: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { data: tasksData, isLoading, error } = useTasks();

  useEffect(() => {
    if (tasksData) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  return (
    <div>
      <TaskList tasks={tasks} />
    </div>
  );
};

export default Page;

// apps/web/src/app/page.tsx
import { useState } from 'react';
import { useClient } from 'next/client';
import { useTasks } from '../modules/task/presentation/TaskSlice';
import { TaskList } from '../modules/task/presentation/TaskList';
import { Task } from '../modules/task/domain/Task';

const Page: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { data: tasksData, isLoading, error } = useTasks();

  useEffect(() => {
    if (tasksData) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  return (
    <div>
      <TaskList tasks={tasks} />
    </div>
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

// apps/web/src/app/page.tsx
import { useState } from 'react';
import { useClient } from 'next/client';
import { useTasks } from '../modules/task/presentation/TaskSlice';
import { TaskList } from '../modules/task/presentation/TaskList';
import { Task } from '../modules/task/domain/Task';

const Page: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { data: tasksData, isLoading, error } = useTasks();

  useEffect(() => {
    if (tasksData) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  return (
    <div>
      <TaskList tasks={tasks} />
    </div>
  );
};

export default Page;

// apps/web/src/app/layout.tsx
import { useState } from 'react';
import { useClient } from 'next/client';
import { useTasks } from '../modules/task/presentation/TaskSlice';
import { TaskList } from '../modules/task/presentation/TaskList';
import { Task } from '../modules/task/domain/Task';

const Page: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { data: tasksData, isLoading, error } = useTasks();

  useEffect(() => {
    if (tasksData) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  return (
    <div>
      <TaskList tasks={tasks} />
    </div>
  );
};

export default Page;

// tests/Task.test.js
import { render, screen } from '@testing-library/react';
import Task from '../src/app/Task';

describe('Task', () => {
  it('renders the task title', () => {
    render(<Task title="Test Task" />);
    const title = screen.getByText('Test Task');
    expect(title).toBeInTheDocument();
  });
});

// tests/TaskList.test.js
import { render, screen } from '@testing-library/react';
import TaskList from '../src/app/TaskList';

describe('TaskList', () => {
  it('renders the task list', () => {
    render(<TaskList tasks={[]} />);
    const tasks = screen.getAllByRole('listitem');
    expect(tasks).toHaveLength(0);
  });
});