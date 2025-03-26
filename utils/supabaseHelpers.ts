import { supabase } from '../utils/supabaseClient';
import { fetchCollectrProductDetails } from './fetchCollectrProductDetails'; // Corrected import

export async function insertMatchedProduct(product: any) {
  const { data, error } = await supabase.from('products').insert([
    {
      title: product.shopifyProduct.title,
      vendor: product.shopifyProduct.vendor,
      handle: product.shopifyProduct.handle,
      tags: product.shopifyProduct.tags,
      status: product.shopifyProduct.status,
      price: product.shopifyProduct.price,
      sku: product.shopifyProduct.sku,
      collectr_id: product.collectrProduct.id,
      market_price: product.collectrProduct.marketPrice,
      collectr_price: product.collectrProduct.price,
    },
  ]);

  if (error) {
    console.error('Error inserting product into Supabase:', error);
    throw error;
  }

  return data;
}

export const checkMatchedProductsInDatabase = async (title: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('title', title); // Query by title instead of SKU

  if (error) {
    console.error('Error checking matched products in database:', error);
    return null;
  }

  return data.length > 0 ? data[0] : null; // Return the matched product if found
};

const handleMatchProducts = async () => {
  try {
    // Fetch Shopify products
    const shopifyResponse = await fetch('/api/shopify');
    if (!shopifyResponse.ok) {
      throw new Error('Failed to fetch Shopify products');
    }
    const shopifyData = await shopifyResponse.json();

    // Match products
    for (const shopifyProduct of shopifyData) {
      const collectrProducts = await searchCollectrBySKU(shopifyProduct.sku);

      if (collectrProducts.length === 1) {
        // If there's only one match, fetch product details and store in Supabase
        const collectrProductDetails = await fetchCollectrProductDetails(collectrProducts[0].id);

        await insertMatchedProduct({
          shopifyProduct,
          collectrProduct: {
            id: collectrProducts[0].id,
            marketPrice: collectrProductDetails.marketPrice,
            price: collectrProductDetails.price,
          },
        });
      } else if (collectrProducts.length > 1) {
        console.log(`Multiple matches found for SKU: ${shopifyProduct.sku}`);
        // Handle multiple matches (e.g., let the user select the correct match)
      } else {
        console.log(`No match found for SKU: ${shopifyProduct.sku}`);
      }
    }

    console.log('All matched products have been stored in Supabase');
  } catch (error: any) {
    console.error('Error matching products:', error);
  }
};

async function searchCollectrBySKU(sku: string) {
  try {
    const response = await fetch(`/api/collectr?sku=${encodeURIComponent(sku)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Collectr products for SKU: ${sku}`);
    }
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error searching Collectr by SKU:', error);
    return [];
  }
}