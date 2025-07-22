const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { items } = req.body;
    const inventory = require('../inventory.json');

    for (let item of items) {
        if (inventory[item.id] && inventory[item.id].stock < item.quantity) {
            return res.status(400).json({ error: `${item.name} is out of stock` });
        }
    }

    const lineItems = items.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
    }));

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: 'https://greenliving-five.vercel.app/success.html',
            cancel_url: 'https://greenliving-five.vercel.app/cancel.html',
        });
        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

