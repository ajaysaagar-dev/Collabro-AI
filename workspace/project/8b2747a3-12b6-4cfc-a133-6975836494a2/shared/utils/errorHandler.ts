import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

const prisma = require('./prismaClient');

const errorHandler = async (
  error: Error,
  request: NextApiRequest,
  response: NextApiResponse
) => {
  console.error('Error occurred:', error);

  if (error instanceof PrismaClientKnownRequestError) {
    return response.status(500).json({
      message: 'Internal Server Error',
      error: 'Database error',
    });
  }

  if (error.name === 'UnauthorizedError') {
    return response.status(401).json({
      message: 'Unauthorized',
      error: 'Unauthorized access',
    });
  }

  if (error.name === 'ValidationError') {
    return response.status(400).json({
      message: 'Validation Error',
      error: 'Invalid request data',
    });
  }

  return response.status(500).json({
    message: 'Internal Server Error',
    error: 'An unexpected error occurred',
  });
};

export default errorHandler;