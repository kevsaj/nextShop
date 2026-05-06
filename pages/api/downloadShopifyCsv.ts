import { NextApiRequest, NextApiResponse } from 'next';
import { utils, write } from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const IMAGE_BASE_URL = 'https://public.getcollectr.com/public-assets/products/product_';

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

  const supabase = getSupabaseAdmin();

  // Batch fetch all matching Supabase products by SKU (card number)
  const cardNumbers = [...new Set(priceChanges.map((c: PriceChange) => c.cardNumber))];
  const { data: dbProducts } = await supabase
    .from('products')
    .select('title, handle, sku, collectr_id')
    .in('sku', cardNumbers);

  // Build a lookup map: sku -> db product
  const productMap = new Map<string, { title: string; handle: string; sku: string; collectr_id: string }>();
  (dbProducts || []).forEach((p) => {
    if (p.sku) productMap.set(p.sku, p);
  });

  const csvRows = priceChanges.map((change: PriceChange) => {
    const dbProduct = productMap.get(change.cardNumber);
    const collectrId = dbProduct?.collectr_id || '';
    const imageUrl = collectrId
      ? `${IMAGE_BASE_URL}${collectrId}.png`
      : '';

    return {
      'Handle': dbProduct?.handle || '',
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
