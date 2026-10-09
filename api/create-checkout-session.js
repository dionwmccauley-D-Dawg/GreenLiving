const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Your cart is empty' });
    }

    const inventory = require('../inventory.json');
    const lineItems = [];

    for (const item of items) {
        const product = inventory[item.id];
        const quantity = Number(item.quantity);

        if (!product) {
            return res.status(400).json({ error: 'Unknown product in cart' });
        }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
            return res.status(400).json({ error: 'Bad quantity' });
        }
        if (product.stock < quantity) {
            return res.status(400).json({ error: `${product.name} is out of stock` });
        }

        lineItems.push({
            price_data: {
                currency: 'usd',
                product_data: { name: product.name },
                unit_amount: Math.round(product.price * 100),
            },
            quantity,
        });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: 'https://greenliving-five.vercel.app/success.html',
            cancel_url: 'https://greenliving-five.vercel.app/cancel.html',
        });
        res.json({ id: session.id, url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
