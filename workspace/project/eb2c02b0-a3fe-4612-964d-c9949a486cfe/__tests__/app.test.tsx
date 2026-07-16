import { render, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { jest } from '@jest/globals';

describe('Test Setup', () => {
  it('renders a simple component', () => {
    const { getByText } = render(<div>Test Component</div>);
    expect(getByText('Test Component')).toBeInTheDocument();
  });

  it('handles fireEvent', () => {
    const handleClick = jest.fn();
    const { getByText } = render(<button onClick={handleClick}>Click me</button>);
    fireEvent.click(getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles async operations', async () => {
    const { getByText } = render(<div>Initial</div>);
    await waitFor(() => {
      expect(getByText('Initial')).toBeInTheDocument();
    });
  });
});

describe('Mock Functions', () => {
  it('creates mock functions correctly', () => {
    const mockFn = jest.fn(() => 'mocked');
    expect(mockFn()).toBe('mocked');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});