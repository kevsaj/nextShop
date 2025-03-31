import { utils } from 'xlsx';

export async function fetchAndOrganizeSkus(shopifyProducts: any[]) {
  try {
    console.log('Fetching and organizing SKUs...');

    // Extract SKUs and group by the first 4 characters before the dash
    const skuGroups: Record<string, string[]> = {};

    shopifyProducts.forEach((product) => {
      const sku = product.variants?.[0]?.sku || null;
      if (sku) {
        const category = sku.split('-')[0]; // Extract the first 4 characters before the dash
        if (!skuGroups[category]) {
          skuGroups[category] = [];
        }
        skuGroups[category].push(sku);
      }
    });

    console.log('Organized SKUs into categories:', skuGroups);

    // Call the API route to create the CSV file
    const response = await fetch('/api/createCsv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skuGroups }),
    });

    if (!response.ok) {
      throw new Error('Failed to create CSV file');
    }

    const data = await response.json();
    console.log('CSV file created successfully:', data.filePath);
  } catch (error) {
    console.error('Error fetching and organizing SKUs:', error);
    throw error;
  }
}