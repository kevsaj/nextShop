const COLLECTR_API_BASE_URL = process.env.COLLECTR_API_BASE_URL!;
const COLLECTR_API_KEY = process.env.COLLECTR_API_KEY!;

export async function fetchAllCollectrProducts(searchString: string) {
  if (!searchString || searchString === 'N/A' || searchString.trim() === '') {
    throw new Error('Invalid searchString: searchString cannot be null, empty, or N/A');
  }

  console.log('searchString:', searchString); // Debug the searchString

  const allProducts: any[] = [];
  let page = 1;
  const limit = 75; // Default limit per page
  const maxPages = 3; // Adjust this to fetch more pages if needed
  let hasMore = true;

  try {
    while (hasMore) {
      const url = `${COLLECTR_API_BASE_URL}/partners/catalog/search?searchString=${encodeURIComponent(
        searchString
      )}&page=${page}&limit=${limit}`;
      console.log(`Request URL: ${url}`);
      console.log(`Request Headers:`, {
        'Content-Type': 'application/json',
        'token': COLLECTR_API_KEY,
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token': COLLECTR_API_KEY, // Include the token in the headers
        },
      });

      if (!response.ok) {
        const errorBody = await response.text(); // Read the response body for more details
        throw new Error(`Error fetching Collectr products: ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      console.log(`API Response for page ${page}:`, data);

      // Since the response is an array, use it directly
      const products = Array.isArray(data) ? data : [];
      console.log(`Fetched ${products.length} products from page ${page}`);

      // Add the fetched products to the list
      allProducts.push(...products);

      // If fewer products are returned than the limit, stop fetching
      if (products.length < limit || page >= maxPages) {
        hasMore = false;
      } else {
        page++; // Move to the next page
      }
    }

    console.log(`Total products fetched for searchString "${searchString}":`, allProducts.length);
    return allProducts;
  } catch (error: any) {
    console.error(`Error fetching Collectr products for searchString "${searchString}":`, error);
    throw error;
  }
}