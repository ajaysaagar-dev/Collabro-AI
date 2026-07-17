import { TodoService } from '../application/todo-service';
import { useQuery, useQueryClient } from 'react-query';
import { useClient } from 'next/client';
import { TodoFilter } from '../types/todo-filter';
import { Todo } from '../types/todo';
import { SearchQuery } from '../types/search-query';
import { useDebounce } from 'use-debounce';

interface TodoListProps {
  filter: TodoFilter;
  onFilterChange: (filter: TodoFilter) => void;
  onSearchChange: (searchQuery: SearchQuery) => void;
}

const TodoList = ({
  filter,
  onFilterChange,
  onSearchChange,
}: TodoListProps) => {
  const client = useClient();
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery(
    ['todos', filter, onSearchChange],
    async () => {
      const response = await client.fetch(
        `/api/todos?filter=${filter}&search=${onSearchChange.search}`
      );
      return response.json();
    },
    {
      // staleTime: 1000 * 60 * 60, // 1 hour
      // cacheTime: 1000 * 60 * 60, // 1 hour
    }
  );

  const todos = data?.todos || [];

  const handleFilterChange = (newFilter: TodoFilter) => {
    onFilterChange(newFilter);
    queryClient.invalidateQueries(['todos', newFilter, onSearchChange]);
  };

  const handleSearchChange = (newSearchQuery: SearchQuery) => {
    onSearchChange(newSearchQuery);
    queryClient.invalidateQueries(['todos', filter, newSearchQuery]);
  };

  const debouncedSearchChange = useDebounce(handleSearchChange, 500);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h2 className="text-lg font-bold mb-4">Todo List</h2>
      <div className="flex justify-between mb-4">
        <button
          className={`${
            filter === TodoFilter.ALL ? 'bg-blue-500' : 'bg-gray-200'
          } text-white px-4 py-2 rounded`}
          onClick={() => handleFilterChange(TodoFilter.ALL)}
        >
          All
        </button>
        <button
          className={`${
            filter === TodoFilter.ACTIVE ? 'bg-blue-500' : 'bg-gray-200'
          } text-white px-4 py-2 rounded`}
          onClick={() => handleFilterChange(TodoFilter.ACTIVE)}
        >
          Active
        </button>
        <button
          className={`${
            filter === TodoFilter.COMPLETED ? 'bg-blue-500' : 'bg-gray-200'
          } text-white px-4 py-2 rounded`}
          onClick={() => handleFilterChange(TodoFilter.COMPLETED)}
        >
          Completed
        </button>
      </div>
      <input
        type="search"
        className="w-full p-2 mb-4"
        placeholder="Search..."
        value={onSearchChange.search}
        onChange={(e) => debouncedSearchChange({ search: e.target.value })}
      />
      <ul className="list-disc pl-4">
        {todos.map((todo) => (
          <li key={todo.id}>
            <span className="font-bold">{todo.title}</span> -{' '}
            <span className="text-gray-600">{todo.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;