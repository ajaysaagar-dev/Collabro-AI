import { z } from 'zod';

export const numberSchema = z.number().finite();

export const operatorSchema = z.enum(['+', '-', '*', '/']);

export const inputSchema = z.object({
  value: z.string().regex(/^-?\d*\.?\d+$/, 'Invalid number format'),
  operator: operatorSchema.optional(),
});

export function validateNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!/^-?\d*\.?\d+$/.test(trimmed)) {
    return null;
  }
  const num = parseFloat(trimmed);
  return isNaN(num) || !isFinite(num) ? null : num;
}

export function validateOperator(input: string): string | null {
  return /^[\+\-\*\/]$/.test(input) ? input : null;
}

export function sanitizeInput(input: string): string {
  return input.replace(/[^\d.\-+]/g, '');
}

export function isValidExpression(expression: string): boolean {
  return /^[\d+\-*/.() ]+$/.test(expression);
}