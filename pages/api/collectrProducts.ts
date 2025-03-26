import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchAllCollectrProducts } from '../../utils/fetchCollectrProducts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { searchString } = req.query; // Get searchString from query parameters
    if (!searchString || typeof searchString !== 'string') {
      throw new Error('Missing or invalid searchString');
    }

    const products = await fetchAllCollectrProducts(searchString);
    res.status(200).json(products);
  } catch (error: any) {
    console.error('Error fetching Collectr products:', error);
    res.status(500).json({ error: error.message });
  }
}