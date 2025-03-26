import React from 'react';

interface ProductTableProps {
  matchedProducts: any[];
  handleSelectMatch: (shopifyProduct: any, collectrProduct: any) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({ matchedProducts, handleSelectMatch }) => {
  // Sort matchedProducts by price in descending order
  const sortedMatchedProducts = [...matchedProducts].sort((a, b) => {
    const priceA = parseFloat(a.shopifyProduct.variants?.[0]?.price || '0');
    const priceB = parseFloat(b.shopifyProduct.variants?.[0]?.price || '0');
    return priceB - priceA; // Descending order
  });

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Matched and Unmatched Products</h2>
      {/* Add a scrollable container for the table */}
      <div
        style={{
          overflowX: 'auto', // Enable horizontal scrolling
          marginTop: '20px',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>Shopify Product</th>
              <th style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>Price</th>
              <th style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>Status</th>
              <th style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>Collectr Options</th>
              <th style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedMatchedProducts.map(({ shopifyProduct, collectrProducts, matchStatus, isMatchedInDatabase }, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: isMatchedInDatabase ? '#4caf50' : 'transparent', // Highlight matched rows in green
                  color: isMatchedInDatabase ? '#ffffff' : 'inherit', // White text for matched rows
                }}
              >
                <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                  {shopifyProduct.title} (SKU: {shopifyProduct.variants?.[0]?.sku || 'N/A'})
                </td>
                <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                  ${shopifyProduct.variants?.[0]?.price || 'N/A'}
                </td>
                <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                  {matchStatus}
                </td>
                <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                  {collectrProducts.length > 0
                    ? collectrProducts.map((collectrProduct: any) => (
                        <div key={collectrProduct.id} style={{ marginBottom: '10px' }}>
                          <span>{collectrProduct.productName}</span>
                          <button
                            onClick={() => handleSelectMatch(shopifyProduct, collectrProduct)}
                            style={{
                              backgroundColor: '#4caf50',
                              color: '#ffffff',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              marginLeft: '10px',
                            }}
                          >
                            Select
                          </button>
                        </div>
                      ))
                    : 'N/A'}
                </td>
                <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                  {shopifyProduct.variants?.[0]?.sku ? (
                    <a
                      href={`https://app.getcollectr.com/?query=${shopifyProduct.variants[0].sku}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: '#1e88e5',
                        color: '#ffffff',
                        textDecoration: 'none',
                        padding: '5px 10px',
                        borderRadius: '5px',
                        display: 'inline-block',
                      }}
                    >
                      View on Collectr
                    </a>
                  ) : (
                    'No SKU'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;