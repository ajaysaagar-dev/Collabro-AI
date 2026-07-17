import { useClient } from 'next/app';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-translate/useTranslation';
import { useKeyboard } from 'shared/hooks/useKeyboard';
import { CalculatorForm } from 'modules/calculator/presentation/CalculatorForm';
import { CalculatorResult } from 'modules/calculator/presentation/CalculatorResult';
import { CalculatorError } from 'modules/calculator/presentation/CalculatorError';
import { CalculatorLoading } from 'modules/calculator/presentation/CalculatorLoading';
import { useCalculator } from 'modules/calculator/services/useCalculator';

const CalculatorPage = () => {
  const { t } = useTranslation();
  const { isKeyboardSupported } = useKeyboard();
  const { calculate, error, loading, result } = useCalculator();

  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [operation, setOperation] = useState('+');

  const handleOperationChange = useCallback((event) => {
    setOperation(event.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setInput1('');
    setInput2('');
    setOperation('+');
  }, []);

  const handleCalculate = useCallback(async () => {
    try {
      const result = await calculate(input1, input2, operation);
      setInput1('');
      setInput2('');
      setOperation('+');
      return result;
    } catch (error) {
      return error;
    }
  }, [input1, input2, operation, calculate]);

  useEffect(() => {
    if (isKeyboardSupported) {
      const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
          handleCalculate();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isKeyboardSupported, handleCalculate]);

  if (loading) {
    return <CalculatorLoading />;
  }

  if (error) {
    return <CalculatorError error={error} />;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-lg font-bold mb-4">{t('calculator:title')}</h1>
      <CalculatorForm
        input1={input1}
        input2={input2}
        operation={operation}
        onOperationChange={handleOperationChange}
        onClear={handleClear}
      />
      <CalculatorResult result={result} />
    </div>
  );
};

export default CalculatorPage;