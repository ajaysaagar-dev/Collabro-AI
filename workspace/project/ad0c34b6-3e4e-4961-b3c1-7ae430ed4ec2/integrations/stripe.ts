import { NextApiRequest, NextApiResponse } from 'next';
import stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = stripe(process.env.STRIPE_SECRET_KEY);

const prisma = new PrismaClient();

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const { amount, description } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100,
        currency: 'usd',
        description,
      });

      res.status(201).json({
        message: 'Payment successful',
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error processing payment' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};