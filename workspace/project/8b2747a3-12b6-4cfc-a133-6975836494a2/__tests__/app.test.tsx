import '@testing-library/jest-dom';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { createClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextAuthOptions } from 'next-auth';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { Button } from '../modules/button/presentation/Button';
import { POST } from '../modules/button/application/ButtonCommand';
import { errorHandler } from '../shared/utils/errorHandler';
import { authOptions } from '../services/auth';
import { ButtonProps } from '../shared/types/button';

jest.mock('@prisma/client');
jest.mock('next-auth');
jest.mock('next/router');
jest.mock('next/head');

const prismaClient = createClient();
const nextAuthSession = jest.fn();
const nextRouter = jest.fn();
const fetch = jest.fn();

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Button component', () => {
    it('renders correctly', () => {
      const { getByText } = render(<Button color="blue" />);
      expect(getByText('Button')).toBeInTheDocument();
    });

    it('calls handleButtonClick when clicked', () => {
      const { getByText } = render(<Button color="blue" />);
      const button = getByText('Button');
      fireEvent.click(button);
      expect(nextRouter).toHaveBeenCalledTimes(1);
    });
  });

  describe('ButtonCommand', () => {
    it('calls updateButtonColor when POST request is made', async () => {
      const req = {
        body: { color: 'red' },
      } as NextApiRequest;
      const res = {
        json: jest.fn(),
        status: jest.fn(() => res),
      } as NextApiResponse;
      await POST(req, res);
      expect(prismaClient.button.update).toHaveBeenCalledTimes(1);
    });

    it('calls errorHandler when PrismaClientKnownRequestError is thrown', async () => {
      const req = {
        body: { color: 'red' },
      } as NextApiRequest;
      const res = {
        json: jest.fn(),
        status: jest.fn(() => res),
      } as NextApiResponse;
      const error = new PrismaClientKnownRequestError('Test error');
      prismaClient.button.update.mockRejectedValue(error);
      await POST(req, res);
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/button', () => {
    it('calls updateButtonColor when POST request is made', async () => {
      const req = {
        body: { color: 'red' },
      } as NextApiRequest;
      const res = {
        json: jest.fn(),
        status: jest.fn(() => res),
      } as NextApiResponse;
      await POST(req, res);
      expect(prismaClient.button.update).toHaveBeenCalledTimes(1);
    });

    it('calls errorHandler when PrismaClientKnownRequestError is thrown', async () => {
      const req = {
        body: { color: 'red' },
      } as NextApiRequest;
      const res = {
        json: jest.fn(),
        status: jest.fn(() => res),
      } as NextApiResponse;
      const error = new PrismaClientKnownRequestError('Test error');
      prismaClient.button.update.mockRejectedValue(error);
      await POST(req, res);
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('errorHandler', () => {
    it('calls next.error when error is thrown', async () => {
      const error = new Error('Test error');
      await errorHandler(error);
      expect(nextAuthSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('authOptions', () => {
    it('returns correct auth options', () => {
      expect(authOptions).toEqual({
        providers: [],
        secret: process.env.NEXTAUTH_SECRET,
      });
    });
  });
});