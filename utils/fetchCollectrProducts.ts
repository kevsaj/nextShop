const COLLECTR_API_BASE_URL = process.env.COLLECTR_API_BASE_URL!;
const COLLECTR_API_KEY = process.env.COLLECTR_API_KEY!;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchAllCollectrProducts(searchString: string) {
  if (!searchString || searchString === 'N/A' || searchString.trim() === '') {
    throw new Error('Invalid searchString: searchString cannot be null, empty, or N/A');
  }

  console.log('searchString:', searchString); // Debug the searchString
  const allProducts: any[] = [];
  let page = 1;
  const limit = 10; // Fetch 50 products per request

  while (true) {
    try {
      const url = `${COLLECTR_API_BASE_URL}/partners/catalog/search?searchString=${encodeURIComponent(searchString)}&page=${page}&limit=${limit}`;
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
      console.log('API Response:', data); // Debug the API response

      // Since the response is an array, use it directly
      const products = Array.isArray(data) ? data : [];
      console.log(`Fetched ${products.length} products from page ${page}`);

      // Add the fetched products to the list
      allProducts.push(...products);

      // If fewer products are returned than the limit, stop fetching
      if (products.length < limit) {
        break;
      }

      // Increment the page number for the next request
      page++;

      // Add a delay between requests
      await delay(1000); // Wait for 1 second before fetching the next page
    } catch (error: any) {
      console.error(`Error on page ${page}:`, error); // Log the error
      throw error;
    }
  }

  return allProducts;
}