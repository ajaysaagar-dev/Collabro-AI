export interface ButtonProps {
  /**
   * The color of the button
   */
  color?: string;

  /**
   * Callback function fired when the button is clicked
   */
  onClick?: () => void;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Optional aria-label for accessibility
   */
  'aria-label'?: string;

  /**
   * Optional aria-describedby for accessibility
   */
  'aria-describedby'?: string;

  /**
   * Optional children to render inside the button
   */
  children?: React.ReactNode;

  /**
   * Optional type attribute for form submission
   */
  type?: 'button' | 'submit' | 'reset';

  /**
   * Optional className for additional styling
   */
  className?: string;
}

export type ButtonColor = string;

export type ButtonState = {
  color: ButtonColor;
  isPressed: boolean;
};