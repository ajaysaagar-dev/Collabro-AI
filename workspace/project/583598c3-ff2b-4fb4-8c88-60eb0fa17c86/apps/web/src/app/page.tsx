import { useSession } from 'next-auth/react';
import { useClient } from 'next/app';
import { Layout } from '../app/layout';
import { Loading } from '../app/loading';
import { ErrorBoundary } from '../app/error';
import { NotFound } from '../app/not-found';
import { useUser } from '../domains/user/hooks';
import { useTask } from '../domains/task/hooks';
import { registerUser, loginUser } from '../services/auth';
import { getTasks } from '../services/task';

export default async function Page() {
  const session = useSession();
  const client = useClient();

  if (!session) {
    return (
      <Layout>
        <h1 className="text-3xl font-bold">Welcome to our app!</h1>
        <p className="text-lg">Please login or register to access your tasks.</p>
        <div className="flex justify-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => client.push('/register')}
          >
            Register
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-4"
            onClick={() => client.push('/login')}
          >
            Login
          </button>
        </div>
      </Layout>
    );
  }

  const user = useUser(session.user);
  const tasks = useTask(getTasks(session.user));

  if (!user || !tasks) {
    return <Loading />;
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
      <p className="text-lg">You have {tasks.length} tasks.</p>
      <ul className="list-disc ml-4">
        {tasks.map((task) => (
          <li key={task.id}>
            <span className="font-bold">{task.title}</span> -{' '}
            <span className="text-gray-600">{task.dueDate}</span>
          </li>
        ))}
      </ul>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => client.push('/tasks')}
      >
        View all tasks
      </button>
    </Layout>
  );
}