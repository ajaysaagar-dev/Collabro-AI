import { useState } from 'react';

interface ResultDisplayProps {
  result: string;
  error: string | null;
  onCopy: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, error, onCopy }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white p-4 rounded-lg shadow-md">
        {error && <p className="text-red-500">{error}</p>}
        {result && (
          <p className="text-lg font-bold mb-4">Result: {result}</p>
        )}
        <button onClick={handleCopy} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
};

export default ResultDisplay;