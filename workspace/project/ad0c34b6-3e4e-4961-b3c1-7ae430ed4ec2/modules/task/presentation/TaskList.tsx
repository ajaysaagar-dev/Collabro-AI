import { useEffect, useState } from 'react';
import { useClient } from 'next/client';
import { Task } from '../../domain/task/Task';
import { TaskService } from '../../modules/task/application/TaskService';

interface TaskListProps {
  loading: boolean;
  error: string | null;
  tasks: Task[] | null;
}

const TaskList: React.FC<TaskListProps> = ({ loading, error, tasks }) => {
  const client = useClient();
  const [tasksData, setTasksData] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasks = await TaskService.getTasks();
        setTasksData(tasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };
    fetchTasks();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {loading && <div className="flex items-center justify-center">Loading...</div>}
      {error && <div className="flex items-center justify-center">{error}</div>}
      {!loading && !error && (
        <ul className="list-none">
          {tasksData.map((task) => (
            <li key={task.id} className="mb-4">
              <Task task={task} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskList;