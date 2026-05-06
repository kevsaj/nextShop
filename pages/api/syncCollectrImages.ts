import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const IMAGE_BASE_URL = 'https://public.getcollectr.com/public-assets/products/product_';
const SHOWCASE_HANDLE = 'beyondcrazy';

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

interface CollectrItem {
  productId?: string;
  product_id?: string;
  id?: string;
  cardNumber?: string;
  card_number?: string;
  sku?: string;
  productName?: string;
  product_name?: string;
  name?: string;
  title?: string;
  imageUrl?: string;
  image_url?: string;
  [key: string]: unknown;
}

function extractCollectrId(item: CollectrItem): string | null {
  const rawImageUrl = (item.imageUrl || item.image_url || '') as string;
  if (rawImageUrl) {
    const match = rawImageUrl.match(/product_(\d+)/);
    if (match) return match[1];
  }
  if (item.productId) return String(item.productId);
  if (item.product_id) return String(item.product_id);
  return null;
}

function extractCardNumber(item: CollectrItem): string | null {
  return (item.cardNumber || item.card_number || item.sku || null) as string | null;
}

function extractProductName(item: CollectrItem): string {
  return (item.productName || item.product_name || item.name || item.title || '') as string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cookie, token } = req.body as { cookie?: string; token?: string };

  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  } else if (cookie) {
    authHeaders['cookie'] = cookie;
  }

  const supabase = getSupabaseAdmin();

  let offset = 0;
  const limit = 100;
  let totalSynced = 0;
  let totalSkipped = 0;
  let hasMore = true;

  while (hasMore) {
    const url =
      `https://api-v2.getcollectr.com/data/showcase/@${SHOWCASE_HANDLE}` +
      `?offset=${offset}&limit=${limit}&unstackedView=true` +
      `&username=00000000-0000-0000-0000-000000000000`;

    const collectrRes = await fetch(url, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'origin': 'https://app.getcollectr.com',
        'referer': 'https://app.getcollectr.com/',
        'user-agent':
          'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
        ...authHeaders,
      },
    });

    if (!collectrRes.ok) {
      const errorText = await collectrRes.text();
      return res.status(502).json({
        error: `Collectr API error at offset ${offset}: ${collectrRes.status}`,
        details: errorText.slice(0, 500),
        synced: totalSynced,
      });
    }

    const data = await collectrRes.json();

    const items: CollectrItem[] = Array.isArray(data)
      ? data
      : data.items || data.products || data.data || [];

    if (items.length === 0) {
      hasMore = false;
      break;
    }

    const rows: { card_number: string; product_name: string; collectr_id: string; image_url: string }[] = [];

    for (const item of items) {
      const cardNumber = extractCardNumber(item);
      const collectrId = extractCollectrId(item);

      if (!cardNumber || !collectrId) {
        totalSkipped++;
        continue;
      }

      rows.push({
        card_number: cardNumber,
        product_name: extractProductName(item),
        collectr_id: collectrId,
        image_url: `${IMAGE_BASE_URL}${collectrId}.png`,
      });
    }

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('card_images')
        .upsert(rows, { onConflict: 'card_number' });

      if (upsertError) {
        return res.status(500).json({
          error: 'Supabase upsert failed',
          details: upsertError.message,
          synced: totalSynced,
        });
      }

      totalSynced += rows.length;
    }

    if (items.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return res.status(200).json({
    success: true,
    synced: totalSynced,
    skipped: totalSkipped,
  });
}
