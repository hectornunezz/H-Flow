import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import Stripe from "stripe";
import logger from "../utils/logger";
import { stripeService } from "../services/stripe.service";

const prisma = new PrismaClient();

export async function getSubscriptionOverview(
  request: Request,
  response: Response,
): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Trainer authentication is required" } });
    return;
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  try {
    const [trainer, generatedThisMonth, completedThisMonth] = await Promise.all([
      prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          subscriptionStatus: true,
          subscriptionCurrentPeriodEnd: true,
        },
      }),
      prisma.marketingEpisode.count({
        where: { trainerId, createdAt: { gte: monthStart } },
      }),
      prisma.marketingEpisode.count({
        where: {
          trainerId,
          status: "completed",
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    if (!trainer) {
      response.status(404).json({ error: { message: "Trainer not found" } });
      return;
    }

    const isPro = ["active", "trialing"].includes(trainer.subscriptionStatus);
    response.json({
      data: {
        plan: isPro ? "Pro" : "Free",
        subscriptionStatus: trainer.subscriptionStatus,
        currentPeriodEnd: trainer.subscriptionCurrentPeriodEnd,
        aiUsage: { generatedThisMonth, completedThisMonth },
      },
    });
  } catch (error) {
    logger.error("Stripe subscription overview request failed", { trainerId, error });
    response.status(500).json({ error: { message: "Unable to load subscription overview" } });
  }
}

export async function createCheckoutSession(request: Request, response: Response): Promise<void> {
  const trainerId = request.auth?.trainerId;
  if (!trainerId) {
    response.status(401).json({ error: { message: "Trainer authentication is required" } });
    return;
  }

  try {
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: { id: true, stripeCustomerId: true },
    });
    if (!trainer) {
      response.status(404).json({ error: { message: "Trainer not found" } });
      return;
    }
    if (!trainer.stripeCustomerId) {
      response.status(409).json({ error: { message: "Trainer has no Stripe customer profile" } });
      return;
    }

    const session = await stripeService.createSubscriptionCheckout({
      trainerId,
      customerId: trainer.stripeCustomerId,
    });
    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL");
    }

    response.status(201).json({ data: { sessionId: session.id, url: session.url } });
  } catch (error) {
    logger.error("Stripe Checkout session creation failed", { trainerId, error });
    response.status(502).json({ error: { message: "Unable to create a Checkout session" } });
  }
}

function getId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | Stripe.Subscription | null,
): string | undefined {
  return typeof value === "string" ? value : value?.id;
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  customerId: string | undefined,
  trainerId?: string,
): Promise<void> {
  const resolvedTrainerId =
    trainerId ??
    (customerId
      ? (
          await prisma.trainer.findUnique({
            where: { stripeCustomerId: customerId },
            select: { id: true },
          })
        )?.id
      : undefined);

  if (!resolvedTrainerId) {
    throw new Error(`No trainer found for Stripe subscription ${subscription.id}`);
  }

  const firstItem = subscription.items.data[0];
  await prisma.trainer.update({
    where: { id: resolvedTrainerId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPriceId: firstItem?.price.id ?? null,
      subscriptionCurrentPeriodEnd: firstItem
        ? new Date(firstItem.current_period_end * 1000)
        : null,
    },
  });
}

export async function handleStripeWebhook(request: Request, response: Response): Promise<void> {
  const signature = request.get("stripe-signature");
  if (!signature || !Buffer.isBuffer(request.body)) {
    response.status(400).json({ error: { message: "A valid Stripe signature is required" } });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripeService.constructWebhookEvent(request.body, signature);
  } catch (error) {
    logger.warn("Stripe webhook signature verification failed", { error });
    response.status(400).json({ error: { message: "Invalid Stripe webhook signature" } });
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "subscription") {
        const subscriptionId = getId(session.subscription);
        const customerId = getId(session.customer);
        if (!subscriptionId) {
          throw new Error(`Checkout session ${session.id} has no subscription`);
        }

        const subscription = await stripeService.retrieveSubscription(subscriptionId);
        await syncSubscription(
          subscription,
          customerId,
          session.metadata?.trainerId ?? session.client_reference_id ?? undefined,
        );
      }
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object;
      await syncSubscription(subscription, getId(subscription.customer), subscription.metadata.trainerId);
    }

    response.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook processing failed", { eventId: event.id, eventType: event.type, error });
    response.status(500).json({ error: { message: "Unable to process Stripe webhook" } });
  }
}
