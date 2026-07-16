import { useState, useEffect } from 'react';

interface PaymentService {
  processPayment(amount: number, method: string): Promise<boolean>;
  validatePayment(amount: number): boolean;
}

const paymentService: PaymentService = {
  processPayment: async (amount: number, method: string): Promise<boolean> => {
    if (!paymentService.validatePayment(amount)) {
      return false;
    }
    
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, method }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Payment processing failed:', error);
      return false;
    }
  },
  
  validatePayment: (amount: number): boolean => {
    return amount > 0 && amount <= 10000;
  },
};

export default paymentService;