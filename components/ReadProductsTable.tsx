import React from 'react';

interface ReadProductsTableProps {
  products: any[];
}

const ReadProductsTable: React.FC<ReadProductsTableProps> = ({ products }) => {
  // Sort products by price in descending order
  const sortedProducts = [...products].sort((a, b) => {
    const priceA = parseFloat(a.variants?.[0]?.price || '0');
    const priceB = parseFloat(b.variants?.[0]?.price || '0');
    return priceB - priceA; // Descending order
  });

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Shopify Products</h2>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px',
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
        }}
      >
        <thead>
          <tr>
            <th style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>Title</th>
            <th style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>SKU</th>
            <th style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {sortedProducts.map((product, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                {product.title}
              </td>
              <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                {product.variants?.[0]?.sku || 'N/A'}
              </td>
              <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                ${product.variants?.[0]?.price || 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReadProductsTable;