import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productId, newPrice } = req.body;

  if (!productId || !newPrice) {
    return res.status(400).json({ error: 'Missing productId or newPrice in request body' });
  }

  try {
    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-01/products/${productId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        product: {
          id: productId,
          variants: [
            {
              price: newPrice,
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Error updating product: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}