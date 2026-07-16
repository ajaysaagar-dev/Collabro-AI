import { z } from 'zod';

export type ValidationResult<T = unknown> = {
  isValid: boolean;
  data?: T;
  errors?: string[];
};

export const numberSchema = z.number().finite();

export const stringSchema = z.string().trim().min(1);

export const optionalNumberSchema = z.number().finite().optional();

export const optionalStringSchema = z.string().trim().optional();

export const validateNumber = (value: unknown): ValidationResult<number> => {
  try {
    const result = numberSchema.parse(value);
    return { isValid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.errors.map((e: z.ZodIssue) => e.message) };
    }
    return { isValid: false, errors: ['Invalid number'] };
  }
};

export const validateString = (value: unknown): ValidationResult<string> => {
  try {
    const result = stringSchema.parse(value);
    return { isValid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.errors.map((e: z.ZodIssue) => e.message) };
    }
    return { isValid: false, errors: ['Invalid string'] };
  }
};

export const validateOptionalNumber = (value: unknown): ValidationResult<number | undefined> => {
  if (value === undefined || value === null) {
    return { isValid: true, data: undefined };
  }
  return validateNumber(value);
};

export const validateOptionalString = (value: unknown): ValidationResult<string | undefined> => {
  if (value === undefined || value === null || value === '') {
    return { isValid: true, data: undefined };
  }
  return validateString(value);
};

export const sanitizeString = (value: string): string => {
  return value.trim().replace(/[<>]/g, '');
};

export const sanitizeNumber = (value: number): number => {
  return Number.isFinite(value) ? value : 0;
};

export const validateRange = (
  value: number,
  min?: number,
  max?: number
): ValidationResult<number> => {
  const numberValidation = validateNumber(value);
  if (!numberValidation.isValid) {
    return numberValidation;
  }

  const num = numberValidation.data!;

  if (min !== undefined && num < min) {
    return { isValid: false, errors: [`Value must be at least ${min}`] };
  }

  if (max !== undefined && num > max) {
    return { isValid: false, errors: [`Value must be at most ${max}`] };
  }

  return { isValid: true, data: num };
};

export const validateOperation = (operation: unknown): ValidationResult<string> => {
  const validOperations = ['add', 'subtract', 'multiply', 'divide'] as const;
  const operationSchema = z.enum(validOperations);

  try {
    const result = operationSchema.parse(operation);
    return { isValid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.errors.map((e: z.ZodIssue) => e.message) };
    }
    return { isValid: false, errors: ['Invalid operation'] };
  }
};

export const validateDivision = (a: number, b: number): ValidationResult<void> => {
  if (b === 0) {
    return { isValid: false, errors: ['Division by zero is not allowed'] };
  }
  return { isValid: true };
};

export const validatePrecision = (value: unknown): ValidationResult<number> => {
  const result = validateNumber(value);
  if (!result.isValid) {
    return result;
  }

  const num = result.data!;

  if (num < 0 || num > 10 || !Number.isInteger(num)) {
    return { isValid: false, errors: ['Precision must be an integer between 0 and 10'] };
  }

  return { isValid: true, data: num };
};

export const validateEmail = (value: unknown): ValidationResult<string> => {
  const emailSchema = z.string().email();

  try {
    const result = emailSchema.parse(value);
    return { isValid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.errors.map((e: z.ZodIssue) => e.message) };
    }
    return { isValid: false, errors: ['Invalid email'] };
  }
};

export const validatePassword = (value: unknown): ValidationResult<string> => {
  const passwordSchema = z.string().min(8);

  try {
    const result = passwordSchema.parse(value);
    return { isValid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.errors.map((e: z.ZodIssue) => e.message) };
    }
    return { isValid: false, errors: ['Invalid password'] };
  }
};

export const validateName = (value: unknown): ValidationResult<string | undefined> => {
  if (value === undefined || value === null || value === '') {
    return { isValid: true, data: undefined };
  }

  const nameSchema = z.string().min(1).max(100);

  try {
    const result = nameSchema.parse(value);
    return { isValid: true, data: sanitizeString(result) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.errors.map((e: z.ZodIssue) => e.message) };
    }
    return { isValid: false, errors: ['Invalid name'] };
  }
};

export const validatePagination = (
  page: unknown,
  limit: unknown
): ValidationResult<{ page: number; limit: number }> => {
  const pageResult = validateOptionalNumber(page);
  const limitResult = validateOptionalNumber(limit);

  if (!pageResult.isValid) {
    return { isValid: false, errors: pageResult.errors };
  }

  if (!limitResult.isValid) {
    return { isValid: false, errors: limitResult.errors };
  }

  const pageNum = pageResult.data ?? 1;
  const limitNum = limitResult.data ?? 10;

  if (pageNum < 1) {
    return { isValid: false, errors: ['Page must be at least 1'] };
  }

  if (limitNum < 1 || limitNum > 100) {
    return { isValid: false, errors: ['Limit must be between 1 and 100'] };
  }

  return { isValid: true, data: { page: pageNum, limit: limitNum } };
};

export const validateId = (id: unknown): ValidationResult<number> => {
  const result = validateNumber(id);
  if (!result.isValid) {
    return result;
  }

  const num = result.data!;

  if (!Number.isInteger(num) || num <= 0) {
    return { isValid: false, errors: ['ID must be a positive integer'] };
  }

  return { isValid: true, data: num };
};

export const validateTheme = (theme: unknown): ValidationResult<string> => {
  const validThemes = ['light', 'dark'] as const;
  const themeSchema = z.enum(validThemes);

  try {
    const result = themeSchema.parse(theme);
    return { isValid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.errors.map((e: z.ZodIssue) => e.message) };
    }
    return { isValid: false, errors: ['Invalid theme'] };
  }
};

export const validateRole = (role: unknown): ValidationResult<string> => {
  const validRoles = ['user', 'admin'] as const;
  const roleSchema = z.enum(validRoles);

  try {
    const result = roleSchema.parse(role);
    return { isValid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.errors.map((e: z.ZodIssue) => e.message) };
    }
    return { isValid: false, errors: ['Invalid role'] };
  }
};

export const validateAndSanitizeNumber = (value: unknown): ValidationResult<number> => {
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return { isValid: false, errors: ['Invalid number format'] };
    }
    return validateNumber(parsed);
  }

  return validateNumber(value);
};

export const validateAndSanitizeString = (value: unknown): ValidationResult<string> => {
  if (typeof value === 'string') {
    return validateString(sanitizeString(value));
  }

  return validateString(value);
};

export const validateCalculatorInput = (
  a: unknown,
  b: unknown,
  operation: unknown
): ValidationResult<{ a: number; b: number; operation: string }> => {
  const aResult = validateAndSanitizeNumber(a);
  if (!aResult.isValid) {
    return { isValid: false, errors: aResult.errors };
  }

  const bResult = validateAndSanitizeNumber(b);
  if (!bResult.isValid) {
    return { isValid: false, errors: bResult.errors };
  }

  const operationResult = validateOperation(operation);
  if (!operationResult.isValid) {
    return { isValid: false, errors: operationResult.errors };
  }

  const op = operationResult.data!;

  if (op === 'divide') {
    const divisionResult = validateDivision(aResult.data!, bResult.data!);
    if (!divisionResult.isValid) {
      return { isValid: false, errors: divisionResult.errors };
    }
  }

  return {
    isValid: true,
    data: {
      a: aResult.data!,
      b: bResult.data!,
      operation: op,
    },
  };
};