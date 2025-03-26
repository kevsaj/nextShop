import React from 'react';

interface ProductTableProps {
  matchedProducts: any[];
  handleSelectMatch: (shopifyProduct: any, collectrProduct: any) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  isLoading: boolean; // Add a prop to indicate loading state
}

const ProductTable: React.FC<ProductTableProps> = ({
  matchedProducts,
  handleSelectMatch,
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}) => {
  // Sort matchedProducts by price in descending order
  const sortedMatchedProducts = [...matchedProducts].sort((a, b) => {
    const priceA = parseFloat(a.shopifyProduct.variants?.[0]?.price || '0');
    const priceB = parseFloat(b.shopifyProduct.variants?.[0]?.price || '0');
    return priceB - priceA; // Descending order
  });

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Matched and Unmatched Products</h2>
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
            {sortedMatchedProducts.map(({ shopifyProduct, collectrProducts, matchStatus, isMatchedInDatabase }, index) => {
              // Clean the SKU by removing the trailing "A" if it exists
              let sku = shopifyProduct.variants?.[0]?.sku || null;
              if (sku && sku.endsWith('A')) {
                sku = sku.slice(0, -1); // Remove the trailing "A"
              }

              return (
                <tr
                  key={index}
                  style={{
                    backgroundColor: isMatchedInDatabase ? '#4caf50' : 'transparent', // Highlight matched rows in green
                    color: isMatchedInDatabase ? '#ffffff' : 'inherit', // White text for matched rows
                  }}
                >
                  <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                    {shopifyProduct.title} (SKU: {sku || 'N/A'})
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
                    {sku ? (
                      <a
                        href={`https://app.getcollectr.com/?query=${encodeURIComponent(sku)}`}
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
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        {isLoading ? (
          <div style={{ color: '#ffffff', fontSize: '16px' }}>Loading...</div>
        ) : (
          <>
            <button
              onClick={() => onPageChange(currentPage - 1)}
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
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                backgroundColor: currentPage === totalPages ? '#ccc' : '#1e88e5',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductTable;