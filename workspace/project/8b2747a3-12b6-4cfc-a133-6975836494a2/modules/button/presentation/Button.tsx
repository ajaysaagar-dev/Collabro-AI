import { ButtonCommand } from '../application/ButtonCommand';
import type { ButtonProps } from '../shared/types/button';
import { useState, useEffect } from 'react';

interface ButtonState {
  color: string;
}

const Button: React.FC<ButtonProps> = ({ color, onClick, children }) => {
  const [state, setState] = useState<ButtonState>({ color });

  useEffect(() => {
    const handleHover = () => {
      setState({ color: state.color === 'primary' ? 'secondary' : 'primary' });
    };

    const handleClick = () => {
      onClick();
    };

    document.addEventListener('mouseover', handleHover);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseover', handleHover);
      document.removeEventListener('click', handleClick);
    };
  }, [color, onClick]);

  return (
    <button
      className={`bg-${state.color} hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;