import { useState, useEffect } from 'react';
import { useStorage } from 'react-use';
import { ButtonColor } from '../types/button';

interface UseButtonStateProps {
  color: ButtonColor;
  onClick: () => void;
}

const useButtonState = (props: UseButtonStateProps) => {
  const [count, setCount] = useState(0);
  const [color, setColor] = useState(props.color);
  const [isPressed, setIsPressed] = useState(false);

  const { storage, isLoading, error } = useStorage({
    key: 'buttonState',
    storage: localStorage,
    initialValue: {
      count: 0,
      color: 'primary',
      isPressed: false,
    },
  });

  useEffect(() => {
    if (isLoading) return;
    const storedState = storage.get();
    if (storedState) {
      setCount(storedState.count);
      setColor(storedState.color);
      setIsPressed(storedState.isPressed);
    }
  }, [isLoading, storage]);

  const handlePress = () => {
    setIsPressed(true);
    props.onClick();
    setCount((prevCount) => prevCount + 1);
    setColor((prevColor) => (prevColor === 'primary' ? 'secondary' : 'primary'));
    storage.set({
      count,
      color,
      isPressed,
    });
  };

  const resetState = () => {
    setCount(0);
    setColor('primary');
    setIsPressed(false);
    storage.set({
      count,
      color,
      isPressed,
    });
  };

  return { count, color, isPressed, handlePress, resetState };
};

export default useButtonState;