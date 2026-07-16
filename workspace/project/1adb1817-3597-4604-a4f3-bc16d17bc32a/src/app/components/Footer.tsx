import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'next/router';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

const server = createServer(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.url === '/api/next-internal') {
    return res.status(200).json({ message: 'OK' });
  }
  return res.status(404).json({ message: 'Not Found' });
});

const history = createMemoryHistory();

describe('Footer', () => {
  it('renders correctly', async () => {
    const { container } = render(<Footer />, { wrapper: Router, initialRouter: history });
    expect(container).toMatchSnapshot();
  });
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});