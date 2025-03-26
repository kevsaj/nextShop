import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';
import { checkMatchedProductsInDatabase } from '../../utils/supabaseHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shopifyProduct, collectrProduct, newPrice } = req.body;

    // Extract SKU from the variants array
    const sku = shopifyProduct.variants?.[0]?.sku || null;

    // Ensure the SKU is not null or undefined
    if (!sku || sku === 'N/A') {
      throw new Error('Invalid SKU: SKU cannot be null or N/A');
    }

    // Ensure tags are formatted as an array
    const tags = Array.isArray(shopifyProduct.tags)
      ? shopifyProduct.tags
      : shopifyProduct.tags.split(',').map((tag: string) => tag.trim());

    // Insert the matched product into the Supabase database
    const { data, error } = await supabase.from('products').insert([
      {
        title: shopifyProduct.title,
        vendor: shopifyProduct.vendor,
        handle: shopifyProduct.handle,
        tags, // Insert tags as an array
        status: shopifyProduct.status,
        price: newPrice,
        sku, // Use the extracted SKU
        collectr_id: collectrProduct.id,
        collectr_product_name: collectrProduct.productName,
      },
    ]);

    if (error) {
      throw error;
    }

    res.status(200).json({ message: 'Matched product saved successfully', data });
  } catch (error: any) {
    console.error('Error saving matched product:', error);
    res.status(500).json({ error: error.message });
  }
}