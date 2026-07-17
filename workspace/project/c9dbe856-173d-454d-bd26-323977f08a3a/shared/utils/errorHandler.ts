import { NextResponse } from 'next/server';

export type AppError = {
  message: string;
  status: number;
};

export class ErrorHandler extends Error {
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ErrorHandler';
    this.status = status;
    Object.setPrototypeOf(this, ErrorHandler.prototype);
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof ErrorHandler) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}

export function tryCatch<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  return fn().catch(handleApiError);
}

export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ErrorHandler(`${fieldName} is required`, 400);
  }
}

export function validateNumber(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (isNaN(num)) {
    throw new ErrorHandler(`${fieldName} must be a valid number`, 400);
  }
  return num;
}

export function validateOperator(operator: string): void {
  const validOperators = ['+', '-', '*', '/'];
  if (!validOperators.includes(operator)) {
    throw new ErrorHandler('Invalid operator', 400);
  }
}