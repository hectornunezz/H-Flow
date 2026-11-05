import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export class StripeService {
  private client: Stripe | undefined;

  private getClient(): Stripe {
    this.client ??= new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    return this.client;
  }

  async createCustomer(input: {
    trainerId: string;
    email: string;
    name: string;
  }): Promise<Stripe.Customer> {
    return this.getClient().customers.create(
      {
        email: input.email,
        name: input.name,
        metadata: { trainerId: input.trainerId },
      },
      { idempotencyKey: `trainer-customer-${input.trainerId}` },
    );
  }

  async createSubscriptionCheckout(input: {
    trainerId: string;
    customerId: string;
  }): Promise<Stripe.Checkout.Session> {
    const priceId = requireEnv("STRIPE_PRO_PRICE_ID");
    const price = await this.getClient().prices.retrieve(priceId);
    if (!price.active || price.recurring?.interval !== "month") {
      throw new Error("STRIPE_PRO_PRICE_ID must reference an active monthly recurring price");
    }

    return this.getClient().checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: requireEnv("STRIPE_SUCCESS_URL"),
      cancel_url: requireEnv("STRIPE_CANCEL_URL"),
      client_reference_id: input.trainerId,
      metadata: { trainerId: input.trainerId },
      subscription_data: { metadata: { trainerId: input.trainerId } },
    });
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.getClient().customers.del(customerId);
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.getClient().webhooks.constructEvent(
      payload,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
    );
  }

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.getClient().subscriptions.retrieve(subscriptionId);
  }
}

export const stripeService = new StripeService();
