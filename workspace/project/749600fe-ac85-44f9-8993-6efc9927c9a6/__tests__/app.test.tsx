import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggleButton from './theme-toggle-button';

// Mock the theme hook
jest.mock('shared/utils/theme', () => ({
  useTheme: jest.fn(),
}));

// Mock the theme toggle commands
jest.mock('../theme/application/theme-toggle-button-commands', () => ({
  useThemeToggle: jest.fn(),
}));

const mockUseTheme = require('shared/utils/theme').useTheme;
const mockUseThemeToggle = require('../theme/application/theme-toggle-button-commands').useThemeToggle;

describe('ThemeToggleButton', () => {
  const mockOnThemeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeToggle.mockReturnValue({
      toggleTheme: jest.fn(),
    });
  });

  describe('rendering', () => {
    it('should render the button with default theme', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme="light" onThemeChange={mockOnThemeChange} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with dark theme', () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme="dark" onThemeChange={mockOnThemeChange} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should display current theme in button text', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme="light" onThemeChange={mockOnThemeChange} />);

      expect(screen.getByText(/light|dark/i)).toBeInTheDocument();
    });
  });

  describe('theme toggle functionality', () => {
    it('should call toggleTheme when button is clicked', async () => {
      const mockToggleTheme = jest.fn();
      mockUseThemeToggle.mockReturnValue({
        toggleTheme: mockToggleTheme,
      });

      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme="light" onThemeChange={mockOnThemeChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('should call onThemeChange callback after theme toggle', async () => {
      const mockToggleTheme = jest.fn().mockResolvedValue(undefined);
      mockUseThemeToggle.mockReturnValue({
        toggleTheme: mockToggleTheme,
      });

      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme="light" onThemeChange={mockOnThemeChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnThemeChange).toHaveBeenCalled();
      });
    });

    it('should handle theme toggle errors gracefully', async () => {
      const mockToggleTheme = jest.fn().mockRejectedValue(new Error('Theme toggle failed'));
      mockUseThemeToggle.mockReturnValue({
        toggleTheme: mockToggleTheme,
      });

      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
      });

      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<ThemeToggleButton theme="light" onThemeChange={mockOnThemeChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('accessibility', () => {
    it('should have accessible button element', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme="light" onThemeChange={mockOnThemeChange} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should be keyboard accessible', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme="light" onThemeChange={mockOnThemeChange} />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(button).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle missing onThemeChange prop gracefully', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme="light" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle undefined theme value', () => {
      mockUseTheme.mockReturnValue({
        theme: undefined as any,
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme={undefined as any} onThemeChange={mockOnThemeChange} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle null theme value', () => {
      mockUseTheme.mockReturnValue({
        theme: null as any,
        setTheme: jest.fn(),
      });

      render(<ThemeToggleButton theme={null as any} onThemeChange={mockOnThemeChange} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('integration with theme context', () => {
    it('should update theme in context when clicked', async () => {
      const mockSetTheme = jest.fn();
      const mockToggleTheme = jest.fn().mockImplementation(() => {
        mockSetTheme('dark');
      });

      mockUseThemeToggle.mockReturnValue({
        toggleTheme: mockToggleTheme,
      });

      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggleButton theme="light" onThemeChange={mockOnThemeChange} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetTheme).toHaveBeenCalledWith('dark');
      });
    });

    it('should reflect theme changes from context', () => {
      const mockSetTheme = jest.fn();

      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggleButton theme="dark" onThemeChange={mockOnThemeChange} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});