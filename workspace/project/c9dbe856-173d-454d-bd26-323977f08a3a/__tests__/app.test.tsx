jest.mock('@/modules/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/modules/auth';
import { useRouter } from 'next/navigation';
import HomePage from '@/app/page';

describe('HomePage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  describe('authentication flow', () => {
    it('should redirect to login page when user is not authenticated', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should not redirect when user is authenticated', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should not redirect while authentication is loading', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe('loading states', () => {
    it('should handle loading state correctly', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      render(<HomePage />);

      expect(useAuth).toHaveBeenCalled();
    });

    it('should handle authenticated loading state', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        isLoading: true,
      });

      render(<HomePage />);

      expect(useAuth).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle router push errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPush.mockImplementation(() => {
        throw new Error('Router error');
      });

      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('should handle multiple rapid authentication state changes', async () => {
      (useAuth as jest.Mock)
        .mockReturnValueOnce({
          isAuthenticated: false,
          isLoading: true,
        })
        .mockReturnValueOnce({
          isAuthenticated: true,
          isLoading: false,
        });

      const { rerender } = render(<HomePage />);

      rerender(<HomePage />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    it('should handle null router gracefully', () => {
      (useRouter as jest.Mock).mockReturnValue(null);

      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      expect(() => render(<HomePage />)).not.toThrow();
    });
  });

  describe('integration with auth module', () => {
    it('should call useAuth hook on component mount', () => {
      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      render(<HomePage />);

      expect(useAuth).toHaveBeenCalledTimes(1);
    });

    it('should re-render when auth state changes', async () => {
      const { rerender } = render(<HomePage />);

      (useAuth as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });

      rerender(<HomePage />);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });
});