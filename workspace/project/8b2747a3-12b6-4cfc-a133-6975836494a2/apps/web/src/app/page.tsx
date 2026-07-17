'use client';

import { useState } from 'react';
import Button from '@/modules/button/presentation/Button';

export default function Page() {
  const [buttonColor, setButtonColor] = useState<string>('blue');

  const handleButtonClick = () => {
    setButtonColor(prevColor => {
      const colors = ['blue', 'green', 'red', 'purple', 'orange'];
      const currentIndex = colors.indexOf(prevColor);
      return colors[(currentIndex + 1) % colors.length];
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-6 text-3xl font-bold text-gray-800">
          Interactive Button Demo
        </h1>
        <p className="mb-4 text-gray-600">
          Current button color: <span className="font-semibold text-blue-600">{buttonColor}</span>
        </p>
        <Button 
          color={buttonColor} 
          onClick={handleButtonClick}
          aria-label="Change button color"
        />
      </div>
    </div>
  );
}