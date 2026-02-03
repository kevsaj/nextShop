import React, { useState } from 'react';
import ProductTable from '../components/ProductTable'; // Import the ProductTable component
import ReadProductsTable from '../components/ReadProductsTable'; // Import the ReadProductsTable component
import { checkMatchedProductsInDatabase } from '../utils/supabaseClient';
import { generateSkuCsv } from '../utils/generateSkuCsv';
import ReadAndUpdateCsv from '../components/ReadAndUpdateCsv';
import SearchSkuTable from '../components/SearchSkuTable';
import SkuProcessor from '../components/SkuProcessor';
import PriceComparisonTable from '../components/PriceComparisonTable';

const Home = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [matchedProducts, setMatchedProducts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMatching, setIsMatching] = useState(false);
  const [cachedProducts, setCachedProducts] = useState<any[]>([]); // Add state for cached products
  const [collectrLimit, setCollectrLimit] = useState<string | null>(null); // Add state for Collectr API limit
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false); // Add state for CSV generation
  const [showOldFeatures, setShowOldFeatures] = useState(false); // Add state for showing old features
  const productsPerPage = 30;

  const fetchShopifyProducts = async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/shopify');
      if (!response.ok) {
        throw new Error('Failed to fetch Shopify products');
      }
      const data = await response.json();

      // Sort products by price in descending order
      const sortedProducts = data.products.sort((a: any, b: any) => {
        const priceA = parseFloat(a.variants?.[0]?.price || '0');
        const priceB = parseFloat(b.variants?.[0]?.price || '0');
        return priceB - priceA; // Descending order
      });

      return sortedProducts;
    } catch (err: any) {
      console.error('Error fetching Shopify products:', err.message);
      throw err;
    }
  };

  // Fetch products from Shopify API
  const handleReadProducts = async () => {
    try {
      const response = await fetch('/api/shopify');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      const products = data.products || [];
      if (products.length === 0) {
        throw new Error('No products found');
      }
      setProducts(products); // Store all products
      setSuccessMessage('Products fetched successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Update product price
  const handleUpdateProduct = async () => {
    if (products.length === 0) {
      setError('No products available to update');
      return;
    }

    const productId = products[0].id; // Get the first product's ID
    const currentPrice = parseFloat(products[0].variants?.[0]?.price || '0');
    const newPrice = (currentPrice + 0.01).toFixed(2); // Increase price by 1 cent

    try {
      const response = await fetch('/api/updateProduct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, newPrice }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      const updatedProduct = await response.json();
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === productId ? { ...product, variants: [{ price: newPrice }] } : product
        )
      );

      setSuccessMessage('Product price updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Match products with Supabase and fetch Collectr options for unmatched products
  const handleMatchProducts = async (page: number) => {
    try {
      setIsMatching(true); // Indicate that matching has been triggered

      let sortedProducts = cachedProducts;

      // Fetch and cache products if not already cached
      if (cachedProducts.length === 0) {
        console.log('Fetching products from Shopify API...');
        sortedProducts = await fetchShopifyProducts();
        setCachedProducts(sortedProducts); // Cache the products
      } else {
        console.log('Using cached products...');
      }

      // Limit products to the specified page (5 products per page)
      const startIndex = (page - 1) * productsPerPage;
      const endIndex = startIndex + productsPerPage;
      const productsForPage = sortedProducts.slice(startIndex, endIndex);
      console.log('Products for page:', productsForPage);

      const matchedProducts = [];
      const unmatchedWithCollectrOptions = [];

      // Process only the products for the current page
      for (const product of productsForPage) {
        const title = product.title;
        let sku = product.variants?.[0]?.sku || null; // Check for SKU

        if (!title || title.trim() === '') {
          console.warn(`Skipping product with invalid title: ${product.title}`);
          continue;
        }

        if (!sku) {
          // If SKU is missing, set the matched option to "No SKU, cannot match"
          matchedProducts.push({
            shopifyProduct: product,
            collectrProducts: [],
            isMatchedInDatabase: false,
            matchStatus: 'No SKU, cannot match',
          });
          continue;
        }

        // Remove trailing "A" from the SKU if it exists
        if (sku.endsWith('A')) {
          sku = sku.slice(0, -1); // Remove the last character
          console.log(`Cleaned SKU: ${sku}`);
        }

        // Check if the product is already matched in the database
        const matchedProductInDb = await checkMatchedProductsInDatabase(title);
        if (matchedProductInDb) {
          matchedProducts.push({
            shopifyProduct: product,
            collectrProducts: [],
            isMatchedInDatabase: true,
            matchStatus: 'Matched and Saved',
          });
        } else {
          // Fetch Collectr API options for unmatched products
          console.log('Fetching Collectr products for SKU:', sku);
          const collectrResponse = await fetch(`/api/collectrProducts?searchString=${encodeURIComponent(sku)}`);
          if (!collectrResponse.ok) {
            console.error(`Failed to fetch Collectr products for SKU: ${sku}`);
            continue;
          }

          const collectrData = await collectrResponse.json();
          unmatchedWithCollectrOptions.push({
            shopifyProduct: product,
            collectrProducts: collectrData,
            isMatchedInDatabase: false,
            matchStatus: 'Not Matched',
          });
        }
      }

      // Combine matched and unmatched products
      setMatchedProducts([...matchedProducts, ...unmatchedWithCollectrOptions]);
      setSuccessMessage('Products matched successfully!');
      setTimeout(() => setSuccessMessage(null), 3000); // Hide banner after 3 seconds
    } catch (err: any) {
      console.error('Error matching products:', err);
      setError(err.message);
    } finally {
      setIsMatching(false); // Reset matching state
    }
  };

  const handleSelectMatch = async (shopifyProduct: any, collectrProduct: any) => {
    try {
      // Ensure the SKU is valid
      const sku = shopifyProduct.variants?.[0]?.sku || null;
      if (!sku || sku === 'N/A') {
        setError('Invalid SKU: SKU cannot be null or N/A');
        return;
      }

      console.log('Sending data to saveMatchedProduct API:', {
        shopifyProduct,
        collectrProduct,
      });

      const response = await fetch('/api/saveMatchedProduct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopifyProduct,
          collectrProduct,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error('Failed to save matched product');
      }

      const result = await response.json();
      console.log('API Response:', result);

      // Update the matchedProducts state to reflect the saved status
      setMatchedProducts((prevMatchedProducts) =>
        prevMatchedProducts.map((product) =>
          product.shopifyProduct.id === shopifyProduct.id
            ? {
                ...product,
                isMatchedInDatabase: true,
                matchStatus: 'Matched and Saved',
              }
            : product
        )
      );

      setSuccessMessage('Matched product saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving matched product:', err);
      setError(err.message);
    }
  };

  // Function to check Collectr API limits
  const handleCheckLimit = async () => {
    try {
      const response = await fetch('/api/collectrLimits');
      if (!response.ok) {
        throw new Error('Failed to fetch Collectr API limits');
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug the response

      // Adjust this based on the actual structure of the response
      const remainingCredits = data[0]?.creditsRemaining || 'N/A';

      setCollectrLimit(`Remaining Credits: ${remainingCredits}`);
      setSuccessMessage('Collectr API limit fetched successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error fetching Collectr API limits:', err.message);
      setError(err.message);
    }
  };

  // Function to generate the SKU CSV
  const handleGenerateCsv = async () => {
    try {
      setIsGeneratingCsv(true); // Set the generating state to true
      let shopifyProducts = products;

      // Fetch products if not already available
      if (products.length === 0) {
        console.log('Fetching products from Shopify API...');
        const response = await fetch('/api/shopify'); // Replace with your actual API endpoint
        if (!response.ok) {
          throw new Error('Failed to fetch Shopify products');
        }
        const data = await response.json();
        console.log('API Response:', data); // Debug the response
        shopifyProducts = data.products; // Use the fetched products
        setProducts(shopifyProducts); // Update the products state
      }

      // Generate the SKU CSV
      if (shopifyProducts.length > 0) {
        await generateSkuCsv(shopifyProducts);
        setSuccessMessage('CSV file generated successfully!');
      } else {
        throw new Error('No products available to generate CSV');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error generating CSV:', err.message);
      setError(err.message);
    } finally {
      setIsGeneratingCsv(false); // Reset the generating state
    }
  };

  return (
    <div style={{ backgroundColor: '#121212', color: '#ffffff', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>Shopify Products</h1>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ marginBottom: '20px' }}>
          <PriceComparisonTable />
        </div>
        <button
          onClick={() => setShowOldFeatures(!showOldFeatures)}
          style={{
            backgroundColor: '#424242',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          {showOldFeatures ? 'Hide Other Features' : 'Show Other Features'}
        </button>
        {showOldFeatures && (
          <div
            style={{
              backgroundColor: '#1e1e1e',
              padding: '20px',
              borderRadius: '10px',
              marginTop: '10px',
            }}
          >
            <button
              onClick={handleCheckLimit}
              style={{
                backgroundColor: '#ff5722',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '10px',
                marginBottom: '10px',
              }}
            >
              Check Limit
            </button>
            <button
              onClick={handleReadProducts}
              style={{
                backgroundColor: '#1e88e5',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '10px',
                marginBottom: '10px',
              }}
            >
              Read Products
            </button>
            <button
              onClick={handleUpdateProduct}
              style={{
                backgroundColor: '#43a047',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '10px',
                marginBottom: '10px',
              }}
            >
              Update Product
            </button>
            <button
              onClick={() => handleMatchProducts(currentPage)}
              style={{
                backgroundColor: '#f57c00',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '10px',
                marginBottom: '10px',
              }}
            >
              Match Products
            </button>
            <button
              onClick={handleGenerateCsv}
              style={{
                backgroundColor: '#ff9800',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '10px',
                marginBottom: '10px',
              }}
              disabled={isGeneratingCsv}
            >
              {isGeneratingCsv ? 'Generating CSV...' : 'Generate SKU CSV'}
            </button>
            <div style={{ marginTop: '20px' }}>
              <SkuProcessor />
            </div>
            <div style={{ marginTop: '20px' }}>
              <ReadAndUpdateCsv />
            </div>
            <div style={{ marginTop: '20px' }}>
              <SearchSkuTable />
            </div>
          </div>
        )}
      </div>
      {successMessage && (
        <div
          style={{
            backgroundColor: '#4caf50',
            color: '#ffffff',
            padding: '10px',
            marginBottom: '20px',
            textAlign: 'center',
            borderRadius: '5px',
          }}
        >
          {successMessage}
        </div>
      )}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      {collectrLimit && (
        <p style={{ color: '#ffffff', textAlign: 'center', marginBottom: '20px' }}>
          {collectrLimit}
        </p>
      )}
      {products.length > 0 && <ReadProductsTable products={products} />}
      {matchedProducts.length > 0 && (
        <ProductTable
          matchedProducts={matchedProducts}
          handleSelectMatch={handleSelectMatch}
          currentPage={currentPage}
          totalPages={Math.ceil(cachedProducts.length / productsPerPage)}
          onPageChange={(newPage) => {
            setIsMatching(true); // Set loading state
            setCurrentPage(newPage);
            handleMatchProducts(newPage).finally(() => setIsMatching(false)); // Reset loading state
          }}
          isLoading={isMatching}
        />
      )}
      {isMatching && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => {
              if (currentPage > 1) {
                const newPage = currentPage - 1;
                setCurrentPage(newPage);
                handleMatchProducts(newPage); // Fetch products for the previous page
              }
            }}
            disabled={currentPage === 1}
            style={{
              backgroundColor: currentPage === 1 ? '#ccc' : '#1e88e5',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              marginRight: '10px',
            }}
          >
            Previous
          </button>
          <button
            onClick={() => {
              const newPage = currentPage + 1;
              setCurrentPage(newPage);
              handleMatchProducts(newPage); // Fetch products for the next page
            }}
            style={{
              backgroundColor: '#1e88e5',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;