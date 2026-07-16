import { ButtonProps } from './components/InteractiveButton';

interface ButtonState {
  color: string;
}

export type ButtonType = 'primary' | 'secondary';

export interface ButtonProps extends ButtonState {
  onClick: () => void;
  type: ButtonType;
}