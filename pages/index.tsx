import React, { useState } from 'react';

const Home = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // State for success banner

  const handleReadProducts = async () => {
    try {
      const response = await fetch('/api/shopify');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data.products.slice(0, 5)); // Get the first 5 products
    } catch (err: any) {
      setError(err.message);
    }
  };

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

      // Show success message
      setSuccessMessage('Hey, new price updated');
      setTimeout(() => setSuccessMessage(null), 3000); // Hide banner after 3 seconds
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#121212', color: '#ffffff', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>Shopify Products</h1>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
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
          }}
        >
          Read
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
          }}
        >
          Update
        </button>
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
      {products.length > 0 && (
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
              <th style={{ border: '1px solid #333', padding: '10px' }}>ID</th>
              <th style={{ border: '1px solid #333', padding: '10px' }}>Title</th>
              <th style={{ border: '1px solid #333', padding: '10px' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>{product.id}</td>
                <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>{product.title}</td>
                <td style={{ border: '1px solid #333', padding: '10px', textAlign: 'center' }}>
                  {product.variants?.[0]?.price || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Home;