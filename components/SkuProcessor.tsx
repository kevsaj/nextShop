import React, { useState } from 'react';
import { fetchAndOrganizeSkus } from '../utils/fetchAndOrganizeSkus';
import { processSkusFromCsv } from '../utils/processSkusFromCsv';

const SkuProcessor: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProcessSkus = async () => {
    try {
      setIsProcessing(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      console.log('Step 1: Fetching and organizing SKUs...');
      // Step 1: Fetch all SKU numbers and create a CSV
      const shopifyProductsResponse = await fetch('/api/shopify'); // Replace with your actual API endpoint
      if (!shopifyProductsResponse.ok) {
        throw new Error('Failed to fetch Shopify products');
      }
      const shopifyProductsData = await shopifyProductsResponse.json();
      const shopifyProducts = shopifyProductsData.products || [];
      if (shopifyProducts.length === 0) {
        throw new Error('No Shopify products found');
      }
      await fetchAndOrganizeSkus(shopifyProducts);

      console.log('Step 2: Processing SKUs from CSV...');
      // Step 2: Process the CSV and generate category-specific CSV files
      await processSkusFromCsv();

      setSuccessMessage('All SKUs processed successfully! CSV files created.');
    } catch (error: any) {
      console.error('Error processing SKUs:', error.message);
      setErrorMessage(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <button
        onClick={handleProcessSkus}
        style={{
          backgroundColor: isProcessing ? '#ccc' : '#3f51b5',
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
        }}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing SKUs...' : 'Process All SKUs'}
      </button>
      {successMessage && (
        <div
          style={{
            backgroundColor: '#4caf50',
            color: '#ffffff',
            padding: '10px',
            marginTop: '20px',
            borderRadius: '5px',
          }}
        >
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div
          style={{
            backgroundColor: '#f44336',
            color: '#ffffff',
            padding: '10px',
            marginTop: '20px',
            borderRadius: '5px',
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default SkuProcessor;