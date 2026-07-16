import { ButtonProps } from '../types/button';

interface InteractiveButtonProps extends ButtonProps {
  color: string;
  onClick: () => void;
}

const InteractiveButton = ({ color, onClick, ...props }: InteractiveButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
    onClick();
  }, [onClick]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleKeyboardDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      onClick();
    }
  }, [onClick]);

  return (
    <button
      className={`text-lg font-bold py-2 px-4 ${isPressed ? 'bg-blue-500' : 'bg-gray-200'} hover:bg-blue-700 transition duration-300`}
      aria-label="Interactive button"
      aria-pressed={isPressed}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyboardDown}
      {...props}
    >
      {props.children}
    </button>
  );
};

export default InteractiveButton;