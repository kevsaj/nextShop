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
        let allProducts: any[] = [];
        let page = 1;
        const limit = 25; // Default limit per page
        const maxPages = 25; // Limit to 25 pages
        let hasMore = true;

        // Fetch all pages of data for the current SKU
        while (hasMore) {
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

          allProducts = allProducts.concat(products);

          // Stop fetching if fewer products are returned than the limit or if maxPages is reached
          if (products.length < limit || page >= maxPages) {
            hasMore = false;
          } else {
            page++;
          }
        }

        console.log(`Total products fetched for SKU ${sku}:`, allProducts.length);

        // Generate CSV content for the current SKU
        const csvRows = [
          ['ID', 'Category ID', 'Category Name', 'Set Name', 'Product Name', 'Card Number', 'Rarity'], // CSV headers
        ];

        if (allProducts.length > 0) {
          allProducts.forEach((product: any) => {
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