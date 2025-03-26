import type { NextApiRequest, NextApiResponse } from 'next';

const COLLECTR_API_BASE_URL = process.env.COLLECTR_API_BASE_URL!;
const COLLECTR_API_KEY = process.env.COLLECTR_API_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${COLLECTR_API_BASE_URL}/partners/account/limits`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'token': COLLECTR_API_KEY, // Use the API key for authentication
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch Collectr limits: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    console.log('Collectr API Response:', data); // Log the response to debug

    // Add headers to disable caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.status(200).json(data); // Return the limits data to the client
  } catch (error: any) {
    console.error('Error fetching Collectr limits:', error.message);
    res.status(500).json({ error: error.message });
  }
}