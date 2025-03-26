const COLLECTR_API_BASE_URL = 'https://api.collectr.com'; // Replace with the actual base URL
const COLLECTR_API_KEY = process.env.COLLECTR_API_KEY || ''; // Ensure the API key is loaded from environment variables

export async function fetchCollectrProductDetails(id: string) {
  try {
    const response = await fetch(
      `${COLLECTR_API_BASE_URL}/partners/catalog/product/${id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token': COLLECTR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching Collectr product details: ${response.statusText}`);
    }

    const data = await response.json();
    return data; // Assuming the response contains the product details
  } catch (error: any) {
    console.error('Error fetching Collectr product details:', error);
    throw error;
  }
}