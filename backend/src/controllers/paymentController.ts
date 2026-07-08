import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

const PAYPAL_API = 'https://api-m.paypal.com';

async function getPayPalToken() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    
    if (!clientId || !secret) {
        throw new Error('PayPal credentials missing in .env');
    }

    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64'),
        },
        body: 'grant_type=client_credentials'
    });

    const data: any = await response.json();
    return data.access_token;
}

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { planId } = req.body; // e.g., 'monthly'
        const amount = '20.00'; // Hardcoded price for now

        console.log(`Creating PayPal order - Plan: ${planId}, Amount: $${amount}`);

        const token = await getPayPalToken();
        const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: amount
                    },
                    description: `Delegate App Premium - ${planId}`
                }]
            })
        });

        const order: any = await response.json();
        if (order.id) {
            return res.json(order);
        } else {
            console.error('PayPal create-order failed:', order);
            return res.status(500).json({ error: 'Failed to create PayPal order', details: order });
        }
    } catch (err: any) {
        console.error('PayPal create-order error:', err);
        return res.status(500).json({ error: err.message });
    }
};

export const captureOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const token = await getPayPalToken();
        const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data: any = await response.json();
        const status = data.status; // COMPLETED

        if (status === 'COMPLETED') {
            // Update the user's subscription in our database
            await prisma.user.update({
                where: { id: req.user.id },
                data: { subscriptionPlan: 'PREMIUM' }
            });

            console.log(`PayPal capture - Order: ${orderId} | Status: ${status} | User: ${req.user.id}`);
            return res.json({ success: true, data });
        } else {
            return res.status(400).json({ error: 'Payment not completed', details: data });
        }
    } catch (err: any) {
        console.error('PayPal capture error:', err);
        return res.status(500).json({ error: err.message });
    }
};
