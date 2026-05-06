import { NextApiRequest, NextApiResponse } from 'next';
import { utils, write } from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const IMAGE_BASE_URL = 'https://public.getcollectr.com/public-assets/products/product_';
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

interface PriceChange {
  productName: string;
  cardNumber: string;
  category: string;
  set: string;
  rarity: string;
  oldPrice: string;
  newPrice: string;
  priceChange: string;
  percentageChange: string;
}

// Fetch all Shopify products across pages and return a SKU -> handle map
async function buildShopifySkuMap(): Promise<Map<string, string>> {
  const skuToHandle = new Map<string, string>();
  let url: string | null =
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-01/products.json?limit=250&fields=handle,variants`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
    });

    if (!res.ok) break;

    const data = await res.json();
    for (const product of data.products || []) {
      for (const variant of product.variants || []) {
        if (variant.sku) {
          // Store with and without trailing 'A' to match both formats
          const sku: string = variant.sku;
          skuToHandle.set(sku, product.handle);
          if (sku.endsWith('A')) {
            skuToHandle.set(sku.slice(0, -1), product.handle);
          } else {
            skuToHandle.set(sku + 'A', product.handle);
          }
        }
      }
    }

    // Follow Shopify pagination via Link header
    const linkHeader = res.headers.get('Link') || '';
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
  }

  return skuToHandle;
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceChanges } = req.body;

  if (!priceChanges || !Array.isArray(priceChanges) || priceChanges.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty price changes' });
  }

  if (priceChanges.length > 50000) {
    return res.status(400).json({ error: 'Too many rows. Maximum 50,000 rows allowed.' });
  }

  // Fetch Shopify SKU->handle map and Supabase image/collectr_id maps in parallel
  const cardNumbers = Array.from(new Set(priceChanges.map((c: PriceChange) => c.cardNumber)));

  const supabase = getSupabaseAdmin();
  const [skuToHandle, productsResult, cardImagesResult] = await Promise.all([
    buildShopifySkuMap(),
    supabase
      .from('products')
      .select('sku, collectr_id')
      .in('sku', cardNumbers),
    supabase
      .from('card_images')
      .select('card_number, image_url')
      .in('card_number', cardNumbers),
  ]);

  // card_images table takes priority; fall back to products.collectr_id
  const skuToImageUrl = new Map<string, string>();
  (productsResult.data || []).forEach((p) => {
    if (p.sku && p.collectr_id) {
      skuToImageUrl.set(p.sku, `${IMAGE_BASE_URL}${p.collectr_id}.png`);
    }
  });
  (cardImagesResult.data || []).forEach((p) => {
    if (p.card_number && p.image_url) {
      skuToImageUrl.set(p.card_number, p.image_url);
    }
  });

  const csvRows = priceChanges.map((change: PriceChange) => {
    const handle = skuToHandle.get(change.cardNumber) || '';
    const imageUrl = skuToImageUrl.get(change.cardNumber) || '';

    return {
      'Handle': handle,
      'Title': change.productName,
      'Variant SKU': change.cardNumber,
      'Variant Price': change.newPrice,
      'Image Src': imageUrl,
      'Category': change.category,
      'Set': change.set,
      'Rarity': change.rarity,
      'Old Price': change.oldPrice,
      'Price Change ($)': change.priceChange,
      'Price Change (%)': `${change.percentageChange}%`,
    };
  });

  const worksheet = utils.json_to_sheet(csvRows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Shopify Import');
  const csvBuffer = write(workbook, { type: 'buffer', bookType: 'csv' });

  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=shopify_price_update_${date}.csv`);
  return res.status(200).send(csvBuffer);
}
