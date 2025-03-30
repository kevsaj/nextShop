const COLLECTR_API_BASE_URL = process.env.COLLECTR_API_BASE_URL!;
const COLLECTR_API_KEY = process.env.COLLECTR_API_KEY!;

// Helper function to add a delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchCollectrProductDetails(id: string, retries = 3): Promise<any> {
  if (!id) {
    throw new Error('Invalid product ID: ID cannot be null or empty');
  }

  let delayMs = 1000; // Initial delay of 1 second

  while (retries > 0) {
    try {
      const response = await fetch(`/api/collectrProductDetails?id=${encodeURIComponent(id)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error fetching Collectr product details: ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      return data; // Return the product details if successful
    } catch (error: any) {
      console.error(`Error fetching Collectr product details (retries left: ${retries}):`, error.message);
      retries -= 1;

      if (retries === 0) {
        console.error(`Failed to fetch Collectr product details for ID ${id} after multiple attempts.`);
        throw error; // Throw the error after exhausting retries
      }

      // Wait for an exponentially increasing delay before retrying
      await delay(delayMs);
      delayMs *= 2; // Double the delay for the next retry
    }
  }
}