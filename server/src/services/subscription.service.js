// Stripe-backed subscriptions. Fully implemented; if STRIPE_SECRET_KEY is not
// set the customer-facing calls return a clear 503 so the rest of the platform
// still runs. Webhooks keep the local Subscription/Payment tables in sync.
const prisma = require("../config/prisma");
const config = require("../config");
const ApiError = require("../utils/ApiError");
const { logger } = require("../utils/logger");

// The STRIPE_PRICE_* env values are monthly amounts in DOLLARS (e.g. "5.99").
const dollars = (v, fallbackCents) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) : fallbackCents;
};

// Plan catalogue. Prices (Stripe Price objects) are auto-created on demand from
// these amounts via ensurePrice() — no manual Stripe dashboard setup needed.
const PLANS = {
  BASIC: { plan: "BASIC", label: "Basic", maxStreams: 1, maxHeight: 720, priceMonthly: dollars(config.stripe.priceBasic, 599) },
  STANDARD: { plan: "STANDARD", label: "Standard", maxStreams: 2, maxHeight: 1080, priceMonthly: dollars(config.stripe.priceStandard, 1199) },
  PREMIUM: { plan: "PREMIUM", label: "Premium", maxStreams: 4, maxHeight: 2160, priceMonthly: dollars(config.stripe.pricePremium, 1799) },
};

const billingEnabled = () => !!config.stripe.secretKey;

let _stripe = null;
function stripe() {
  if (!billingEnabled()) throw new ApiError(503, "Billing is not configured (set STRIPE_SECRET_KEY)");
  if (!_stripe) _stripe = require("stripe")(config.stripe.secretKey);
  return _stripe;
}

function getPlans() {
  return Object.values(PLANS).map((p) => ({ ...p, configured: billingEnabled() }));
}

// Find-or-create a recurring monthly Stripe Price for a plan, keyed by a stable
// lookup_key so it's created once and reused across restarts. Returns price id.
const _priceCache = {};
async function ensurePrice(planKey) {
  if (_priceCache[planKey]) return _priceCache[planKey];
  const plan = PLANS[planKey];
  if (!plan) throw ApiError.badRequest("Unknown plan");
  const lookupKey = `bingely_${planKey.toLowerCase()}_monthly_${plan.priceMonthly}`;

  const existing = await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  let price = existing.data[0];
  if (!price) {
    const product = await stripe().products.create({ name: `Bingely+ ${plan.label}` });
    price = await stripe().prices.create({
      product: product.id,
      unit_amount: plan.priceMonthly,
      currency: "usd",
      recurring: { interval: "month" },
      lookup_key: lookupKey,
    });
  }
  _priceCache[planKey] = price.id;
  return price.id;
}

async function getMySubscription(viewerId) {
  return prisma.subscription.findUnique({ where: { viewerId } });
}

async function listPayments(viewerId) {
  return prisma.payment.findMany({ where: { viewerId }, orderBy: { createdAt: "desc" }, take: 100 });
}

// Ensure the viewer has a Stripe customer + a local Subscription shell row.
async function ensureCustomer(viewer) {
  let sub = await prisma.subscription.findUnique({ where: { viewerId: viewer.id } });
  if (sub?.stripeCustomerId) return sub;

  const customer = await stripe().customers.create({ email: viewer.email, name: viewer.name, metadata: { viewerId: viewer.id } });
  sub = await prisma.subscription.upsert({
    where: { viewerId: viewer.id },
    update: { stripeCustomerId: customer.id },
    create: { viewerId: viewer.id, stripeCustomerId: customer.id, status: "NONE" },
  });
  return sub;
}

// Directly activate a plan (used when Stripe isn't configured — local/dev, or
// admin-comped accounts). Sets the subscription ACTIVE for 30 days.
async function activatePlan(viewerId, planKey) {
  const plan = PLANS[planKey];
  if (!plan) throw ApiError.badRequest("Unknown plan");
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return prisma.subscription.upsert({
    where: { viewerId },
    update: { plan: planKey, status: "ACTIVE", currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false, ...planLimits(planKey) },
    create: { viewerId, plan: planKey, status: "ACTIVE", currentPeriodEnd: periodEnd, ...planLimits(planKey) },
  });
}

// STEP 1 of checkout (called by POST /subscriptions/checkout).
//   • Billing off  → activate instantly (demo) → { mode: "demo" }.
//   • Billing on   → ensure the Stripe Customer + Price exist, and tell the
//                    client to render the card form → { mode: "card", plan, priceId }.
async function subscribe(viewerId, planKey) {
  const plan = PLANS[planKey];
  if (!plan) throw ApiError.badRequest("Unknown plan");

  if (!billingEnabled()) {
    await activatePlan(viewerId, planKey);
    return { mode: "demo", plan: planKey };
  }

  const viewer = await prisma.viewer.findUnique({ where: { id: viewerId } });
  if (!viewer) throw ApiError.notFound("Viewer not found");
  await ensureCustomer(viewer); // creates the Stripe Customer if needed
  const priceId = await ensurePrice(planKey);
  return { mode: "card", plan: planKey, priceId, priceMonthly: plan.priceMonthly };
}

// STEP 2 of checkout (called by POST /subscriptions/confirm) with the
// PaymentMethod the browser tokenised via Stripe Elements. Attaches the card,
// creates (or switches) the subscription, and syncs it to our DB so the
// subscription gate works immediately (even before the webhook fires).
async function confirm(viewerId, planKey, paymentMethodId) {
  if (!billingEnabled()) {
    const sub = await activatePlan(viewerId, planKey); // demo fallback
    return { status: "active", subscription: sub };
  }
  if (!paymentMethodId) throw ApiError.badRequest("Missing payment method");

  const viewer = await prisma.viewer.findUnique({ where: { id: viewerId } });
  if (!viewer) throw ApiError.notFound("Viewer not found");
  const local = await ensureCustomer(viewer);
  const customer = local.stripeCustomerId;
  const priceId = await ensurePrice(planKey);

  // Attach the card to the customer and make it their default for invoices.
  await stripe().paymentMethods.attach(paymentMethodId, { customer });
  await stripe().customers.update(customer, { invoice_settings: { default_payment_method: paymentMethodId } });

  let stripeSub;
  if (local.stripeSubscriptionId) {
    // Plan change on the existing subscription.
    const current = await stripe().subscriptions.retrieve(local.stripeSubscriptionId);
    stripeSub = await stripe().subscriptions.update(local.stripeSubscriptionId, {
      items: [{ id: current.items.data[0].id, price: priceId }],
      default_payment_method: paymentMethodId,
      proration_behavior: "create_prorations",
      metadata: { viewerId, plan: planKey },
    });
  } else {
    // New subscription. error_if_incomplete → fails loudly if the card is
    // declined instead of leaving a dangling "incomplete" subscription.
    stripeSub = await stripe().subscriptions.create({
      customer,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      payment_behavior: "error_if_incomplete",
      expand: ["latest_invoice.payment_intent"],
      metadata: { viewerId, plan: planKey },
    });
  }

  await syncFromStripeSubscription(stripeSub); // mark ACTIVE in our DB now
  return { status: stripeSub.status, subscription: await getMySubscription(viewerId) };
}

async function createPortalSession(viewerId) {
  const sub = await prisma.subscription.findUnique({ where: { viewerId } });
  if (!sub?.stripeCustomerId) throw ApiError.badRequest("No billing account yet");
  const session = await stripe().billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: config.stripe.cancelUrl });
  return { url: session.url };
}

async function cancel(viewerId) {
  const sub = await prisma.subscription.findUnique({ where: { viewerId } });
  if (!sub?.stripeSubscriptionId) throw ApiError.badRequest("No active subscription");
  await stripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
  return prisma.subscription.update({ where: { viewerId }, data: { cancelAtPeriodEnd: true } });
}

// ---- Webhook handling ------------------------------------------------------
function planLimits(planKey) {
  const p = PLANS[planKey] || PLANS.BASIC;
  return { maxStreams: p.maxStreams, maxHeight: p.maxHeight };
}

function constructEvent(rawBody, signature) {
  if (!config.stripe.webhookSecret) throw new ApiError(503, "Webhook secret not configured");
  return stripe().webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

async function syncFromStripeSubscription(stripeSub) {
  const viewerId = stripeSub.metadata?.viewerId;
  const planKey = stripeSub.metadata?.plan;
  if (!viewerId) return;
  const statusMap = { active: "ACTIVE", trialing: "TRIALING", past_due: "PAST_DUE", canceled: "CANCELED", incomplete: "INCOMPLETE" };
  await prisma.subscription.upsert({
    where: { viewerId },
    update: {
      stripeSubscriptionId: stripeSub.id,
      stripeCustomerId: stripeSub.customer,
      plan: planKey || undefined,
      status: statusMap[stripeSub.status] || "NONE",
      currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
      cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
      ...planLimits(planKey),
    },
    create: {
      viewerId,
      stripeSubscriptionId: stripeSub.id,
      stripeCustomerId: stripeSub.customer,
      plan: planKey || undefined,
      status: statusMap[stripeSub.status] || "NONE",
      currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
      cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
      ...planLimits(planKey),
    },
  });
}

async function recordInvoicePayment(invoice) {
  const customerId = invoice.customer;
  const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
  if (!sub) return;
  await prisma.payment.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: { status: "SUCCEEDED", amountCents: invoice.amount_paid, currency: invoice.currency },
    create: {
      viewerId: sub.viewerId,
      subscriptionId: sub.id,
      stripeInvoiceId: invoice.id,
      amountCents: invoice.amount_paid,
      currency: invoice.currency,
      status: "SUCCEEDED",
      description: invoice.lines?.data?.[0]?.description || "Subscription payment",
    },
  });
}

async function handleEvent(event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncFromStripeSubscription(event.data.object);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded":
      await recordInvoicePayment(event.data.object);
      break;
    default:
      logger.debug(`Unhandled Stripe event: ${event.type}`);
  }
}

module.exports = {
  PLANS, getPlans, getMySubscription, listPayments,
  subscribe, confirm, activatePlan, ensurePrice, createPortalSession, cancel,
  constructEvent, handleEvent,
};
