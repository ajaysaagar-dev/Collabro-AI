import { PrismaClient } from '@prisma/client';

interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  status: string;
}

export const prisma = new PrismaClient();

export default class OrderService {
  async createOrder(userId: string, restaurantId: string, orderData: Order): Promise<Order> {
    try {
      const newOrder = await prisma.order.create({
        data: {
          userId,
          restaurantId,
          status: 'pending',
        },
      });
      return newOrder;
    } catch (error) {
      throw new Error('Failed to create order');
    }
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });
      return order;
    } catch (error) {
      throw new Error('Failed to get order');
    }
  }

  async updateOrderStatus(orderId: string, newStatus: string): Promise<Order | null> {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
        },
      });
      return updatedOrder;
    } catch (error) {
      throw new Error('Failed to update order status');
    }
  }
}