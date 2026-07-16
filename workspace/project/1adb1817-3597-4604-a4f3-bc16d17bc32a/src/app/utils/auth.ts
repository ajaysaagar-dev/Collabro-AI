import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { JWT } from 'next-auth/jwt';
import { User } from '@/app/models/User';
import { api } from '@/app/services/api';

const prisma = new PrismaClient();

export const generateJWT = async (user: User) => {
  const token = await JWT.sign(user);
  return token;
};

export const verifyJWT = async (token: string) => {
  try {
    const decoded = await JWT.verify(token);
    return decoded;
  } catch (error) {
    return null;
  }
};

export const hashPassword = async (password: string) => {
  const hashedPassword = await api.hashPassword(password);
  return hashedPassword;
};

export const verifyPassword = async (password: string, hashedPassword: string) => {
  const isValid = await api.verifyPassword(password, hashedPassword);
  return isValid;
};

export const authenticateUser = async (email: string, password: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }
    return user;
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (email: string, password: string, name: string) => {
  try {
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, password: hashedPassword, name } });
    return user;
  } catch (error) {
    throw error;
  }
};