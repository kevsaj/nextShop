import { saveAs } from 'file-saver';

export async function generateSkuCsv(shopifyProducts: any[]) {
  try {
    console.log('Starting SKU CSV generation...');

    // Extract unique SKUs before the dash
    const uniqueSkus = Array.from(
      new Set(
        shopifyProducts
          .map((product) => product.variants?.[0]?.sku?.split('-')[0] || null)
          .filter((sku) => sku) // Remove null or undefined SKUs
      )
    );

    console.log('Unique SKUs:', uniqueSkus);

    // Process only the first unique SKU
    if (uniqueSkus.length > 0) {
      const sku = uniqueSkus[0];
      console.log(`Processing only the first SKU: ${sku}`);

      try {
        const allProducts: Map<string, any> = new Map(); // Use a Map to avoid duplicates
        let page = 1;
        const limit = 25; // Default limit per page
        const maxPages = 3; // Limit to 3 pages
        let hasMore = true;

        // Fetch all pages of data for the current SKU
        while (hasMore) {
          console.log(`Fetching page ${page} for SKU ${sku}`);
          const response = await fetch(
            `/api/collectrProducts?searchString=${encodeURIComponent(sku)}&page=${page}&limit=${limit}`
          );

          if (!response.ok) {
            console.error(`Failed to fetch Collectr data for SKU: ${sku}`);
            break;
          }

          const data = await response.json();
          console.log(`API Response for SKU ${sku}, Page ${page}:`, data);

          // Handle the API response correctly
          const products = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
          console.log(`Fetched ${products.length} products for SKU ${sku}, Page ${page}`);

          // Add products to the Map to avoid duplicates
          products.forEach((product: any) => {
            if (!allProducts.has(product.id)) {
              allProducts.set(product.id, product);
            }
          });

          console.log(`Total unique products after page ${page}:`, allProducts.size);

          // Stop fetching if fewer products are returned than the limit or if maxPages is reached
          if (products.length < limit || page >= maxPages) {
            hasMore = false;
          } else {
            page++;
          }
        }

        console.log(`Total unique products fetched for SKU ${sku}:`, allProducts.size);

        // Convert Map to an array for CSV generation
        const productArray = Array.from(allProducts.values());

        // Generate CSV content for the current SKU
        const csvRows = [
          ['ID', 'Category ID', 'Category Name', 'Set Name', 'Product Name', 'Card Number', 'Rarity'], // CSV headers
        ];

        if (productArray.length > 0) {
          productArray.forEach((product) => {
            csvRows.push([
              product.id || '',
              product.categoryId || '',
              product.categoryName || '',
              product.setName || '',
              product.productName || '',
              product.cardNumber || '',
              product.rarity || '',
            ]);
          });
        } else {
          csvRows.push(['No data found', '', '', '', '', '', '']);
        }

        // Convert to CSV string
        const csvContent = csvRows.map((row) => row.join(',')).join('\n');

        // Create a Blob and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `${sku}.csv`);

        console.log(`CSV file generated for SKU: ${sku}`);
      } catch (error) {
        console.error(`Error processing SKU ${sku}:`, error);
      }
    } else {
      console.log('No SKUs found to process.');
    }

    console.log('CSV generation process completed!');
  } catch (error) {
    console.error('Error generating SKU CSVs:', error);
    throw error;
  }
}