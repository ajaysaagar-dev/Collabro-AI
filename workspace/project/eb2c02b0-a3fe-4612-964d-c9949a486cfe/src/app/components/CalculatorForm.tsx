import { useState } from 'react';

interface CalculatorFormProps {
  onSubmit: (values: { number1: number; number2: number; operation: string }) => void;
}

const CalculatorForm: React.FC<CalculatorFormProps> = ({ onSubmit }) => {
  const [number1, setNumber1] = useState<number>(0);
  const [number2, setNumber2] = useState<number>(0);
  const [operation, setOperation] = useState<string>('add');
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === 'number1') {
      setNumber1(parseFloat(value));
    } else if (name === 'number2') {
      setNumber2(parseFloat(value));
    } else if (name === 'operation') {
      setOperation(value);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await onSubmit({ number1, number2, operation });
      console.log('Result:', result);
    } catch (error) {
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="number1">Number 1:</label>
        <input
          type="number"
          id="number1"
          name="number1"
          value={number1}
          onChange={handleInputChange}
          aria-label="Number 1"
        />
      </div>
      <div>
        <label htmlFor="number2">Number 2:</label>
        <input
          type="number"
          id="number2"
          name="number2"
          value={number2}
          onChange={handleInputChange}
          aria-label="Number 2"
        />
      </div>
      <div>
        <label htmlFor="operation">Operation:</label>
        <select id="operation" name="operation" value={operation} onChange={handleInputChange}>
          <option value="add">Add</option>
          <option value="subtract">Subtract</option>
          <option value="multiply">Multiply</option>
          <option value="divide">Divide</option>
        </select>
      </div>
      <button type="submit">Calculate</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};

export default CalculatorForm;