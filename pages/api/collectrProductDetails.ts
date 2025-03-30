import type { NextApiRequest, NextApiResponse } from 'next';

const COLLECTR_API_BASE_URL = process.env.COLLECTR_API_BASE_URL!;
const COLLECTR_API_KEY = process.env.COLLECTR_API_KEY!;

// Helper function to add a delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing product ID' });
  }

  const maxRetries = 3; // Number of retries
  let retries = 0;
  let delayMs = 1000; // Initial delay of 1 second

  while (retries < maxRetries) {
    try {
      const response = await fetch(`${COLLECTR_API_BASE_URL}/partners/catalog/product/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token': COLLECTR_API_KEY,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch Collectr product details: ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      res.status(200).json(data);
      return; // Exit the function after a successful response
    } catch (error: any) {
      retries += 1;
      console.error(`Error fetching Collectr product details (attempt ${retries}):`, error.message);

      if (retries >= maxRetries) {
        console.error(`Failed to fetch Collectr product details for ID ${id} after ${maxRetries} attempts.`);
        res.status(503).json({ error: 'Service Unavailable', details: error.message });
        return;
      }

      // Wait for an exponentially increasing delay before retrying
      await delay(delayMs);
      delayMs *= 2; // Double the delay for the next retry
    }
  }
}