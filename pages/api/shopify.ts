import type { NextApiRequest, NextApiResponse } from 'next';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-01/products.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching Shopify data: ${response.statusText}`);
    }

    const data = await response.json();
    const products = data.products.map((product: any) => ({
      id: product.id,
      title: product.title,
      vendor: product.vendor,
      handle: product.handle,
      tags: product.tags,
      status: product.status,
      variants: product.variants.map((variant: any) => ({
        price: variant.price,
        sku: variant.sku,
      })),
    }));

    res.status(200).json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}