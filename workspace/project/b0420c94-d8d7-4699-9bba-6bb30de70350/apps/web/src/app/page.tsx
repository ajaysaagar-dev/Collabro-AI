import { useSession } from 'next-auth/react';
import { useClient } from 'next/client';
import { TodoList } from '../modules/todo/components/TodoList';
import { TodoForm } from '../modules/todo/components/TodoForm';
import { Layout } from '../app/layout';

export default function Page() {
  const session = useSession();
  const client = useClient();

  if (!session) {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Todo List App</h1>
          <p className="text-gray-600 mb-4">
            Please sign in to access your todo list.
          </p>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => client.push('/api/auth/signin')}
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Todo List</h1>
        <div className="flex justify-between mb-4">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => client.push('/api/todos')}
          >
            Create Todo
          </button>
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => client.push('/api/todos?filter=all')}
          >
            Filter All
          </button>
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => client.push('/api/todos?filter=active')}
          >
            Filter Active
          </button>
          <button
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => client.push('/api/todos?filter=completed')}
          >
            Filter Completed
          </button>
        </div>
        <TodoList />
        <TodoForm />
      </div>
    </Layout>
  );
}