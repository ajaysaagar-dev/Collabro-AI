import type { AppProps } from 'next/app';
import Layout from '../layout';

function Page({ Component, pageProps }: AppProps) {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCalculate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input1, input2 }),
      });
      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [input1, input2]);

  const handleClear = useCallback(() => {
    setInput1('');
    setInput2('');
    setResult('');
    setError('');
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleCalculate();
    }
  }, [handleCalculate]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Calculator</h1>
        <div className="flex gap-4 mb-4">
          <input
            type="number"
            value={input1}
            onChange={(event) => setInput1(event.target.value)}
            className="w-1/2 p-2 border border-gray-400 rounded-lg"
            placeholder="Number 1"
            aria-label="Number 1"
            aria-required={true}
            onKeyDown={handleKeyDown}
          />
          <input
            type="number"
            value={input2}
            onChange={(event) => setInput2(event.target.value)}
            className="w-1/2 p-2 border border-gray-400 rounded-lg"
            placeholder="Number 2"
            aria-label="Number 2"
            aria-required={true}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleCalculate}
          aria-label="Calculate"
          aria-required={true}
        >
          Calculate
        </button>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleClear}
          aria-label="Clear"
          aria-required={true}
        >
          Clear
        </button>
        {loading ? (
          <p className="text-lg font-bold mt-4">Loading...</p>
        ) : (
          <div className="mt-4">
            {result && (
              <p className="text-lg font-bold">Result: {result}</p>
            )}
            {error && (
              <p className="text-lg font-bold text-red-500">
                Error: {error}
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Page;