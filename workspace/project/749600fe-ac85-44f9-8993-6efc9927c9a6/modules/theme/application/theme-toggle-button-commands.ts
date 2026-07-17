// modules/theme/application/theme-toggle-button-commands.ts

import { ThemeToggleButtonAggregate } from '../domain/theme-toggle-button-aggregate';
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: NextApiRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const theme = await prisma.theme.findFirst();
    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }
    return NextResponse.json({ theme: theme.theme });
  } catch (error) {
    console.error('Error getting theme:', error);
    return NextResponse.json({ error: 'Failed to get theme' }, { status: 500 });
  }
}

export async function POST(request: NextApiRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const body = request.json();
    if (!body.theme) {
      return NextResponse.json({ error: 'Theme is required' }, { status: 400 });
    }
    const themeToggleButtonAggregate = new ThemeToggleButtonAggregate();
    const result = await themeToggleButtonAggregate.toggleTheme(body.theme);
    return NextResponse.json({ theme: result.theme });
  } catch (error) {
    console.error('Error setting theme:', error);
    return NextResponse.json({ error: 'Failed to set theme' }, { status: 500 });
  }
}