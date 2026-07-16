import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CartItemPayload {
  restaurantId: string;
  quantity: number;
}

interface CartItemResponse {
  id: string;
  restaurantId: string;
  quantity: number;
}

export const addItemToCart = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const { restaurantId, quantity } = req.body as CartItemPayload;

    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        restaurantId,
      },
    });

    if (existingCartItem) {
      const updatedCartItem = await prisma.cartItem.update({
        where: {
          id: existingCartItem.id,
        },
        data: {
          quantity: existingCartItem.quantity + quantity,
        },
      });
      return res.status(200).json({
        id: updatedCartItem.id,
        restaurantId: updatedCartItem.restaurantId,
        quantity: updatedCartItem.quantity,
      });
    }

    const newCartItem = await prisma.cartItem.create({
      data: {
        restaurantId,
        quantity,
      },
    });

    return res.status(201).json({
      id: newCartItem.id,
      restaurantId: newCartItem.restaurantId,
      quantity: newCartItem.quantity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to add item to cart' });
  }
};

export const removeCartItem = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const { id } = req.query as { id: string };

    const deletedCartItem = await prisma.cartItem.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to remove item from cart' });
  }
};

export const updateCartItem = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const { id, quantity } = req.body as { id: string; quantity: number };

    const updatedCartItem = await prisma.cartItem.update({
      where: {
        id,
      },
      data: {
        quantity,
      },
    });

    return res.status(200).json({
      id: updatedCartItem.id,
      restaurantId: updatedCartItem.restaurantId,
      quantity: updatedCartItem.quantity,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update item in cart' });
  }
};

export const getCartItems = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const userId = req.query.userId as string;

    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId,
      },
    });

    return res.status(200).json({ cartItems });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to get cart items' });
  }
};

export const calculateCartTotals = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const userId = req.query.userId as string;

    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId,
      },
      include: {
        restaurant: true,
      },
    });

    const total = cartItems.reduce((sum, item) => sum + item.quantity * item.restaurant.price, 0);

    return res.status(200).json({ total });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to calculate cart totals' });
  }
};