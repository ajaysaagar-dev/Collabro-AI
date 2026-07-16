import type { NextPage } from 'next';
import { useCalculator } from './hooks/useCalculator';
import CalculatorForm from './components/CalculatorForm';
import ResultDisplay from './components/ResultDisplay';
import CalculationHistory from './components/CalculationHistory';

const Page = () => {
  const { calculationHistory, calculate, loading, error } = useCalculator();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Calculator</h1>
      <CalculatorForm onCalculate={calculate} />
      <ResultDisplay result={calculationHistory} error={null} onCopy={() => {}} />
      <CalculationHistory history={calculationHistory} />
    </div>
  );
};

export default Page;