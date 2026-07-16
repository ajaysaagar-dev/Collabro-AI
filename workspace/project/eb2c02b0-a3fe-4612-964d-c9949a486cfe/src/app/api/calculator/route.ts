import { NextRequest, NextResponse } from 'next/server';
import { validateNumber, sanitizeNumber } from '@/app/lib/validation';

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  let record = rateLimitStore.get(identifier);

  if (!record || record.resetTime <= now) {
    record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(identifier, record);
  }

  record.count++;
  const allowed = record.count <= RATE_LIMIT_MAX_REQUESTS;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count);
  return { allowed, remaining, resetTime: record.resetTime };
}

interface CalculatorRequest {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

function performOperation(operation: string, a: number, b: number): number {
  switch (operation) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero is not allowed');
      }
      return a / b;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const rateLimitKey = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
    const rateLimitResult = checkRateLimit(rateLimitKey);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { operation, a, b } = body as CalculatorRequest;

    if (!operation || typeof operation !== 'string') {
      return NextResponse.json(
        { error: 'Operation is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof a !== 'number' || typeof b !== 'number') {
      return NextResponse.json(
        { error: 'Both a and b must be numbers' },
        { status: 400 }
      );
    }

    const validOperations = ['add', 'subtract', 'multiply', 'divide'];
    if (!validOperations.includes(operation)) {
      return NextResponse.json(
        { error: `Invalid operation. Must be one of: ${validOperations.join(', ')}` },
        { status: 400 }
      );
    }

    const sanitizedA = sanitizeNumber(a);
    const sanitizedB = sanitizeNumber(b);

    if (!validateNumber(sanitizedA) || !validateNumber(sanitizedB)) {
      return NextResponse.json(
        { error: 'Invalid number values provided' },
        { status: 400 }
      );
    }

    let result: number;
    try {
      result = performOperation(operation, sanitizedA, sanitizedB);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Calculation error' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      operation,
      a: sanitizedA,
      b: sanitizedB,
      result,
    });

    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return response;
  } catch (error) {
    console.error('Calculator error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const rateLimitKey = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
    const rateLimitResult = checkRateLimit(rateLimitKey);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');
    const a = searchParams.get('a');
    const b = searchParams.get('b');

    if (!operation || !a || !b) {
      return NextResponse.json(
        { error: 'Operation, a, and b query parameters are required' },
        { status: 400 }
      );
    }

    const numA = parseFloat(a);
    const numB = parseFloat(b);

    if (isNaN(numA) || isNaN(numB)) {
      return NextResponse.json(
        { error: 'Invalid number values for a and b' },
        { status: 400 }
      );
    }

    const validOperations = ['add', 'subtract', 'multiply', 'divide'];
    if (!validOperations.includes(operation)) {
      return NextResponse.json(
        { error: `Invalid operation. Must be one of: ${validOperations.join(', ')}` },
        { status: 400 }
      );
    }

    const sanitizedA = sanitizeNumber(numA);
    const sanitizedB = sanitizeNumber(numB);

    if (!validateNumber(sanitizedA) || !validateNumber(sanitizedB)) {
      return NextResponse.json(
        { error: 'Invalid number values provided' },
        { status: 400 }
      );
    }

    let result: number;
    try {
      result = performOperation(operation, sanitizedA, sanitizedB);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Calculation error' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      operation,
      a: sanitizedA,
      b: sanitizedB,
      result,
    });

    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return response;
  } catch (error) {
    console.error('Calculator GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}