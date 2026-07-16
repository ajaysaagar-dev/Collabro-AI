import { useMemo, useCallback, useState } from 'react';

interface CalculatorState {
  result: string | null;
  isLoading: boolean;
  error: string | null;
}

interface CalculatorFormInputs {
  expression: string;
}

const useCalculator = (): CalculatorState => {
  const [state, setState] = useState<CalculatorState>({
    result: null,
    isLoading: false,
    error: null,
  });

  const onSubmit = useCallback(async (data: CalculatorFormInputs) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await calculate(data);
      setState(prev => ({ ...prev, result: result, isLoading: false }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
    }
  }, []);

  return state;
};

export default useCalculator;

async function calculate(data: CalculatorFormInputs): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const result = eval(data.expression);
        resolve(result.toString());
      } catch (e) {
        resolve('Error');
      }
    }, 100);
  });
}