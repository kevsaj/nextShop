import React, { useState } from 'react';

const SearchSkuTable: React.FC = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [sku, setSku] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!sku.trim()) {
      setError('Please enter a valid SKU number.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      // Fetch all data for the entered SKU
      const response = await fetch(`/api/collectrProducts?searchString=${encodeURIComponent(sku)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch data for the entered SKU.');
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setResults(data); // Set the results to display in the table
      } else {
        setError('No results found for the entered SKU.');
      }
    } catch (err: any) {
      console.error('Error fetching SKU data:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <button
        onClick={() => setShowSearch(!showSearch)}
        style={{
          backgroundColor: '#9c27b0', // Unique purple color for the button
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        {showSearch ? 'Hide Search Box' : 'Search SKU'}
      </button>

      {showSearch && (
        <div>
          <h2>Search SKU</h2>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Enter SKU number"
            style={{
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              marginRight: '10px',
              width: '300px',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              backgroundColor: '#43a047',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Search
          </button>

          {isLoading && (
            <div style={{ marginTop: '20px' }}>
              <div className="spinner" />
              <p style={{ color: '#ffffff' }}>Searching... Please wait.</p>
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: '#f44336',
                color: '#ffffff',
                padding: '10px',
                marginTop: '20px',
                borderRadius: '5px',
              }}
            >
              {error}
            </div>
          )}

          {results.length > 0 && (
            <table
              style={{
                margin: '20px auto',
                borderCollapse: 'collapse',
                width: '80%',
                color: '#ffffff',
              }}
            >
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '10px' }}>ID</th>
                  <th style={{ border: '1px solid #ccc', padding: '10px' }}>Category Name</th>
                  <th style={{ border: '1px solid #ccc', padding: '10px' }}>Set Name</th>
                  <th style={{ border: '1px solid #ccc', padding: '10px' }}>Product Name</th>
                  <th style={{ border: '1px solid #ccc', padding: '10px' }}>Card Number</th>
                  <th style={{ border: '1px solid #ccc', padding: '10px' }}>Rarity</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result: any, index: number) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #ccc', padding: '10px' }}>{result.id}</td>
                    <td style={{ border: '1px solid #ccc', padding: '10px' }}>{result.categoryName}</td>
                    <td style={{ border: '1px solid #ccc', padding: '10px' }}>{result.setName}</td>
                    <td style={{ border: '1px solid #ccc', padding: '10px' }}>{result.productName}</td>
                    <td style={{ border: '1px solid #ccc', padding: '10px' }}>{result.cardNumber}</td>
                    <td style={{ border: '1px solid #ccc', padding: '10px' }}>{result.rarity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchSkuTable;