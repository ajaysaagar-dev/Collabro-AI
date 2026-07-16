import { render, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { setupJestMock } from './jest.setup';
import { setupPrismaMock } from './jest.setup';
import { setupNextAuthMock } from './jest.setup';
import { setupFetchMock } from './jest.setup';
import { createRouter } from 'next/router';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { NextAuth } from 'next-auth';
import { fetch } from 'isomorphic-unfetch';
import { act } from 'react-dom/test-utils';
import { Button } from './components/InteractiveButton';
import { Layout } from './app/layout';
import { HomePage } from './app/page';
import { useButtonState } from './hooks/useButtonState';
import { ButtonColor } from './types/button';

jest.mock('next/auth');
jest.mock('prisma/client');
jest.mock('react-use');
jest.mock('isomorphic-unfetch');

const prismaMock = setupPrismaMock();
const nextAuthMock = setupNextAuthMock();
const fetchMock = setupFetchMock();
const routerMock = setupRouterMock();

const server = setupServer(
  nextAuthMock,
  prismaMock,
  fetchMock,
  routerMock
);

beforeAll(() => {
  server.listen();
});

afterAll(() => {
  server.close();
});

const PrismaClientMock = prismaMock.PrismaClient as jest.Mocked<PrismaClient>;

describe('Layout component', () => {
  it('renders correctly', async () => {
    const { getByText } = render(
      <Layout>
        <HomePage />
      </Layout>
    );

    expect(getByText('Home Page')).toBeInTheDocument();
  });

  it('calls handleButtonClick when button is pressed', async () => {
    const { getByText } = render(
      <Layout>
        <HomePage />
      </Layout>
    );

    const button = getByText('Interactive Button');
    const handleButtonClick = jest.fn();

    fireEvent.click(button);

    await act(async () => {
      expect(handleButtonClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe('HomePage component', () => {
  it('renders correctly', async () => {
    const { getByText } = render(<HomePage />);

    expect(getByText('Home Page')).toBeInTheDocument();
  });

  it('calls useButtonState when button is pressed', async () => {
    const { getByText } = render(<HomePage />);
    const button = getByText('Interactive Button');
    const handleButtonClick = jest.fn();

    fireEvent.click(button);

    await act(async () => {
      expect(useButtonState).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useButtonState hook', () => {
  it('returns initial state', () => {
    const props = { color: 'blue', onClick: jest.fn() };
    const { color, onClick } = useButtonState(props);

    expect(color).toBe('blue');
    expect(onClick).toHaveBeenCalledTimes(0);
  });

  it('calls onClick when button is pressed', () => {
    const props = { color: 'blue', onClick: jest.fn() };
    const { color, onClick } = useButtonState(props);

    fireEvent.click(props.onClick);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('InteractiveButton component', () => {
  it('renders correctly', async () => {
    const { getByText } = render(<Button color="blue" onClick={jest.fn()} />);

    expect(getByText('Interactive Button')).toBeInTheDocument();
  });

  it('calls onClick when button is pressed', async () => {
    const { getByText } = render(<Button color="blue" onClick={jest.fn()} />);
    const button = getByText('Interactive Button');
    const handleButtonClick = jest.fn();

    fireEvent.click(button);

    await act(async () => {
      expect(handleButtonClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe('fetch API', () => {
  it('returns data from API', async () => {
    fetchMock.get.mockImplementationOnce(() => Promise.resolve({ data: 'Hello World' }));

    const response = await fetch('/api/data');

    expect(response.json()).toBe('Hello World');
  });

  it('throws error when API fails', async () => {
    fetchMock.get.mockImplementationOnce(() => Promise.reject(new Error('API failed')));

    await expect(fetch('/api/data')).rejects.toThrowError('API failed');
  });
});

describe('NextAuth session', () => {
  it('creates session', async () => {
    const session = await nextAuthMock.createSession();

    expect(session).toHaveProperty('user');
  });

  it('throws error when session fails', async () => {
    nextAuthMock.createSession.mockImplementationOnce(() => Promise.reject(new Error('Session failed')));

    await expect(nextAuthMock.createSession()).rejects.toThrowError('Session failed');
  });
});

describe('Prisma client', () => {
  it('creates client', async () => {
    const client = prismaMock.PrismaClient;

    expect(client).toBeInstanceOf(PrismaClient);
  });

  it('throws error when client fails', async () => {
    prismaMock.PrismaClient.mockImplementationOnce(() => Promise.reject(new Error('Client failed')));

    await expect(prismaMock.PrismaClient).rejects.toThrowError('Client failed');
  });
});

describe('Router', () => {
  it('navigates to page', async () => {
    const router = createRouter();

    router.push('/page');

    await act(async () => {
      expect(router.pathname).toBe('/page');
    });
  });

  it('throws error when navigation fails', async () => {
    routerMock.push.mockImplementationOnce(() => Promise.reject(new Error('Navigation failed')));

    await expect(routerMock.push('/page')).rejects.toThrowError('Navigation failed');
  });
});