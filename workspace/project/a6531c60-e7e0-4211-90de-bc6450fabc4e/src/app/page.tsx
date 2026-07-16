import { useState } from 'react';
import InteractiveButton from './components/InteractiveButton';
import { useButtonState } from '@/hooks/useButtonState';
import type { ButtonColor } from '@/types/button';

export default function HomePage() {
  const [feedback, setFeedback] = useState<string>('');
  const { color, clickCount, handleClick } = useButtonState();

  const handleButtonClick = (newColor: ButtonColor) => {
    handleClick(newColor);
    setFeedback(`Button clicked! Color changed to ${newColor}. Total clicks: ${clickCount + 1}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Interactive Button Demo</h1>
        <p className="text-gray-600 mb-8">
          Click the button below to change its color and track interactions.
        </p>

        <InteractiveButton
          color={color}
          clickCount={clickCount}
          onClick={handleButtonClick}
        />

        {feedback && (
          <div
            className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800"
            role="status"
            aria-live="polite"
          >
            <p className="font-medium">{feedback}</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-white border border-gray-200 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Statistics</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <dt className="text-gray-500">Current Color</dt>
            <dd className="font-medium text-gray-900 capitalize">{color}</dd>
            <dt className="text-gray-500">Click Count</dt>
            <dd className="font-medium text-gray-900">{clickCount}</dd>
          </dl>
        </div>
      </div>
    </main>
  );
}