const COLLECTR_API_BASE_URL = process.env.COLLECTR_API_BASE_URL!;
const COLLECTR_API_KEY = process.env.COLLECTR_API_KEY!;

export async function searchCollectrBySKU(sku: string) {
  try {
    const response = await fetch(
      `${COLLECTR_API_BASE_URL}/partners/catalog/search?searchString=${sku}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token': COLLECTR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error searching Collectr products: ${response.statusText}`);
    }

    const data = await response.json();
    return data.products; // Assuming the response contains a `products` array
  } catch (error: any) {
    console.error('Error searching Collectr products:', error);
    throw error;
  }
}