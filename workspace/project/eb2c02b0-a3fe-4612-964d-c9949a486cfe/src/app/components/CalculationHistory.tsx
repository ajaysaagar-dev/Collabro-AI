import { useState, useEffect } from 'react';

interface CalculationHistoryItem {
  id: string;
  date: string;
  operation: string;
  value: number;
}

interface CalculationHistoryProps {
  history: CalculationHistoryItem[];
}

const CalculationHistory: React.FC<CalculationHistoryProps> = ({ history }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(false);
        setError(null);
      } catch (err) {
        setLoading(false);
        setError('Error fetching history');
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <ul>
      {history.map((item) => (
        <li key={item.id}>
          <span>{item.date}</span>
          <span>{item.operation}</span>
          <span>{item.value}</span>
          <button onClick={() => console.log('Delete', item.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
};

export default CalculationHistory;