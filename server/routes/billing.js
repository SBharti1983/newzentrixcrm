const express = require('express');
const stripeKey = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim() !== ''
    ? process.env.STRIPE_SECRET_KEY
    : 'sk_test_placeholder';
const stripe = require('stripe')(stripeKey);
const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKey',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'YourSecret',
});

// Plan configuration
const PLANS = {
    starter: {
        priceId: process.env.STRIPE_PLAN_STARTER || 'price_1starter',
        amount: 290000, // in paise for Razorpay (INR 2,900)
        name: 'Starter',
        limits: { max_users: 5, max_leads: 2000, max_projects: 10 }
    },
    pro: {
        priceId: process.env.STRIPE_PLAN_PRO || 'price_1pro',
        amount: 790000, // in paise (INR 7,900)
        name: 'Professional',
        limits: { max_users: 15, max_leads: 10000, max_projects: 50 }
    },
    enterprise: {
        priceId: process.env.STRIPE_PLAN_ENTERPRISE || 'price_1enterprise',
        amount: 1990000, // in paise (INR 19,900)
        name: 'Enterprise',
        limits: { max_users: 999, max_leads: 99999, max_projects: 999 }
    }
};

/**
 * ─── STRIPE FLOW ──────────────────────────────────────────────────
 */
router.post('/subscribe', auth, async (req, res) => {
    const { plan } = req.body;
    const tenantId = req.tenantId; // attached by auth middleware

    if (!plan || !PLANS[plan]) {
        return res.status(400).json({ error: 'Invalid plan selected' });
    }

    try {
        // 1. Get or Create Stripe Customer
        const { rows: [tenant] } = await pool.query('SELECT name, email, stripe_customer_id FROM tenants t JOIN users u ON u.tenant_id = t.id WHERE t.id = $1 AND u.role = \'admin\' LIMIT 1', [tenantId]);

        let customerId = tenant.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                name: tenant.name,
                email: tenant.email,
                metadata: { tenantId }
            });
            customerId = customer.id;
            await pool.query('UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2', [customerId, tenantId]);
        }

        // 2. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: PLANS[plan].priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing`,
            metadata: {
                tenantId,
                planKey: plan
            },
            subscription_data: {
                metadata: {
                    tenantId,
                    planKey: plan
                }
            }
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe Session Error:', err);
        res.status(500).json({ error: 'Failed to initiate payment. Please try again.' });
    }
});

/**
 * ─── RAZORPAY FLOW ────────────────────────────────────────────────
 */

// 1. Create Order
router.post('/razorpay/order', auth, async (req, res) => {
    const { plan } = req.body;
    const tenantId = req.tenantId;

    if (!plan || !PLANS[plan]) {
        return res.status(400).json({ error: 'Invalid plan selected' });
    }

    try {
        const options = {
            amount: PLANS[plan].amount,
            currency: 'INR',
            receipt: `rcpt_${tenantId.slice(0, 10)}`,
            metadata: { tenantId, planKey: plan }
        };

        const order = await razorpay.orders.create(options);
        res.json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Razorpay Order Error:', err);
        res.status(500).json({ error: 'Failed to create payment order' });
    }
});

// 2. Verify Payment (Manual call from frontend after success)
router.post('/razorpay/verify', auth, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planKey } = req.body;
    const tenantId = req.tenantId;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'YourSecret')
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Payment verified!
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const plan = PLANS[planKey];
            const { limits } = plan;

            await client.query(`
                UPDATE tenants 
                SET plan = $1, max_users = $2, max_leads = $3, max_projects = $4
                WHERE id = $5
            `, [planKey, limits.max_users, limits.max_leads, limits.max_projects, tenantId]);

            await client.query(`
                INSERT INTO subscriptions (tenant_id, plan, status, amount, gateway, gateway_sub_id)
                VALUES ($1, $2, 'active', $3, 'razorpay', $4)
            `, [tenantId, planKey, plan.amount / 100, razorpay_payment_id]);

            await client.query('COMMIT');
            res.json({ success: true, message: 'Payment verified and plan upgraded!' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('RP Verify DB Error:', err);
            res.status(500).json({ error: 'Upgrade failed' });
        } finally {
            client.release();
        }
    } else {
        res.status(400).json({ error: 'Invalid signature' });
    }
});

/**
 * ─── WEBHOOKS ─────────────────────────────────────────────────────
 */

/**
 * Webhook handler for Stripe events
 * This should be called by Stripe to finalize the subscription
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { tenantId, planKey } = session.metadata;
        const subscriptionId = session.subscription;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const plan = PLANS[planKey];
            const { limits } = plan;

            // Update Tenant Plan & Limits
            await client.query(`
                UPDATE tenants 
                SET plan = $1, 
                    max_users = $2, 
                    max_leads = $3, 
                    max_projects = $4,
                    stripe_subscription_id = $5
                WHERE id = $6
            `, [planKey, limits.max_users, limits.max_leads, limits.max_projects, subscriptionId, tenantId]);

            // Add Subscription Record
            await client.query(`
                INSERT INTO subscriptions (tenant_id, plan, status, gateway, gateway_sub_id)
                VALUES ($1, $2, 'active', 'stripe', $3)
            `, [tenantId, planKey, subscriptionId]);

            await client.query('COMMIT');
            console.log(`✅ Tenant ${tenantId} upgraded to ${planKey}`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Webhook processing error:', err);
        } finally {
            client.release();
        }
    }

    res.json({ received: true });
});

// Get or generate referral code for the tenant
router.get('/referral', auth, async (req, res) => {
    try {
        const { rows: [tenant] } = await pool.query('SELECT slug, referral_code FROM tenants WHERE id = $1', [req.tenantId]);
        
        let code = tenant.referral_code;
        if (!code) {
            code = `${tenant.slug.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            await pool.query('UPDATE tenants SET referral_code = $1 WHERE id = $2', [code, req.tenantId]);
        }
        
        const { rows: referrals } = await pool.query(`
            SELECT r.*, t.name as referee_name, t.slug as referee_slug
            FROM referrals r
            JOIN tenants t ON r.referee_id = t.id
            WHERE r.referrer_id = $1
            ORDER BY r.created_at DESC
        `, [req.tenantId]);

        res.json({ code, referrals });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch referral profile' });
    }
});

module.exports = router;
