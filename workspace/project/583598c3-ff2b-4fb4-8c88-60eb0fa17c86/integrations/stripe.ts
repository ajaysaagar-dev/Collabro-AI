import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-01-30',
});

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'processing' | 'requires_payment_method' | 'canceled';
  clientSecret: string;
}

export interface CheckoutSession {
  id: string;
  paymentIntentId: string;
  customerId?: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    this.stripe = stripe;
  }

  async createPaymentIntent(amount: number, currency: string = 'usd', metadata?: Record<string, string>): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        metadata: {
          ...metadata,
          integration: 'todo-app',
        },
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status as 'succeeded' | 'processing' | 'requires_payment_method' | 'canceled',
        clientSecret: paymentIntent.client_secret!,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment intent';
      throw new Error(`Stripe payment intent creation failed: ${errorMessage}`);
    }
  }

  async createCheckoutSession(
    amount: number,
    successUrl: string,
    cancelUrl: string,
    customerId?: string,
    metadata?: Record<string, string>
  ): Promise<CheckoutSession> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Todo App Premium',
                description: 'Premium subscription for Todo App',
              },
              amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: customerId,
        metadata: {
          ...metadata,
          integration: 'todo-app',
        },
      });

      return {
        id: session.id,
        paymentIntentId: session.payment_intent as string,
        customerId: session.customer as string | undefined,
        amount,
        currency: 'usd',
        successUrl,
        cancelUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      throw new Error(`Stripe checkout session creation failed: ${errorMessage}`);
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status as 'succeeded' | 'processing' | 'requires_payment_method' | 'canceled',
        clientSecret: paymentIntent.client_secret!,
      };
    } catch (error) {
      if (error instanceof Stripe.errors.ResourceNotFoundError) {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve payment intent';
      throw new Error(`Stripe payment intent retrieval failed: ${errorMessage}`);
    }
  }

  async retrieveCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      return {
        id: session.id,
        paymentIntentId: session.payment_intent as string,
        customerId: session.customer as string | undefined,
        amount: 0,
        currency: 'usd',
        successUrl: '',
        cancelUrl: '',
      };
    } catch (error) {
      if (error instanceof Stripe.errors.ResourceNotFoundError) {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve checkout session';
      throw new Error(`Stripe checkout session retrieval failed: ${errorMessage}`);
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
      });

      return refund;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create refund';
      throw new Error(`Stripe refund creation failed: ${errorMessage}`);
    }
  }

  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      return customer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create customer';
      throw new Error(`Stripe customer creation failed: ${errorMessage}`);
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);

      if (customer instanceof Stripe.Customer) {
        return customer;
      }

      return null;
    } catch (error) {
      if (error instanceof Stripe.errors.ResourceNotFoundError) {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve customer';
      throw new Error(`Stripe customer retrieval failed: ${errorMessage}`);
    }
  }

  async updateCustomer(customerId: string, updates: { email?: string; name?: string }): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, updates);

      return customer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update customer';
      throw new Error(`Stripe customer update failed: ${errorMessage}`);
    }
  }

  async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      await this.stripe.customers.del(customerId);

      return true;
    } catch (error) {
      if (error instanceof Stripe.errors.ResourceNotFoundError) {
        return false;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete customer';
      throw new Error(`Stripe customer deletion failed: ${errorMessage}`);
    }
  }

  async listCustomers(email?: string): Promise<Stripe.Customer[]> {
    try {
      const customers = await this.stripe.customers.list({
        email,
      });

      return customers.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list customers';
      throw new Error(`Stripe customer listing failed: ${errorMessage}`);
    }
  }

  async createProduct(name: string, description?: string): Promise<Stripe.Product> {
    try {
      const product = await this.stripe.products.create({
        name,
        description,
      });

      return product;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
      throw new Error(`Stripe product creation failed: ${errorMessage}`);
    }
  }

  async createPrice(productId: string, unitAmount: number, currency: string = 'usd'): Promise<Stripe.Price> {
    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: unitAmount,
        currency,
      });

      return price;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create price';
      throw new Error(`Stripe price creation failed: ${errorMessage}`);
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    trialPeriodDays?: number
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: trialPeriodDays,
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create subscription';
      throw new Error(`Stripe subscription creation failed: ${errorMessage}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);

      return subscription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
      throw new Error(`Stripe subscription cancellation failed: ${errorMessage}`);
    }
  }

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      return subscription;
    } catch (error) {
      if (error instanceof Stripe.errors.ResourceNotFoundError) {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve subscription';
      throw new Error(`Stripe subscription retrieval failed: ${errorMessage}`);
    }
  }

  async listSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
      });

      return subscriptions.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list subscriptions';
      throw new Error(`Stripe subscription listing failed: ${errorMessage}`);
    }
  }

  async webhookHandler(payload: string, signature: string, secret: string): Promise<Stripe.Event> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);

      return event;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid webhook signature';
      throw new Error(`Stripe webhook verification failed: ${errorMessage}`);
    }
  }
}

export const stripeService = new StripeService();

export default stripeService;