import React, { useState } from 'react';
import { read, utils } from 'xlsx';

interface PriceChange {
  productName: string;
  cardNumber: string;
  category: string;
  set: string;
  rarity: string;
  oldPrice: string;
  newPrice: string;
  priceChange: string;
  percentageChange: string;
}

const PriceComparisonTable: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortField, setSortField] = useState<keyof PriceChange>('priceChange');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [priceFilter, setPriceFilter] = useState<'all' | 'increases' | 'decreases'>('all');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    
    // Validate file type
    if (selectedFile) {
      const validTypes = ['.csv', 'text/csv', 'application/vnd.ms-excel', 'application/csv'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (fileExtension !== '.csv' && !validTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please upload a CSV file.');
        setFile(null);
        event.target.value = ''; // Reset input
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (selectedFile.size > maxSize) {
        setError('File too large. Maximum size is 10MB.');
        setFile(null);
        event.target.value = ''; // Reset input
        return;
      }
    }
    
    setFile(selectedFile);
    setError(null);
    setSuccessMessage(null);
  };

  const handleComparePrices = async () => {
    if (!file) {
      setError('No file selected');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPriceChanges([]);

    try {
      // Read the uploaded CSV file
      const data = await file.arrayBuffer();
      const workbook = read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const newRows = utils.sheet_to_json(sheet);

      // Send the new CSV data to the API for comparison
      const response = await fetch('/api/comparePrices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newData: newRows }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare prices');
      }

      const result = await response.json();
      setPriceChanges(result.priceChanges);
      setCurrentPage(1);
      setPriceFilter('all');
      
      if (result.priceChanges.length === 0) {
        setSuccessMessage('No price changes detected!');
      } else {
        setSuccessMessage(`Found ${result.priceChanges.length} price changes!`);
      }
      
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error comparing prices:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCsv = async () => {
    if (priceChanges.length === 0) {
      setError('No price changes to export');
      return;
    }

    try {
      const response = await fetch('/api/downloadPriceChanges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceChanges }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate CSV');
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `price_changes_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage('CSV file downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error generating CSV:', err);
      setError(err.message);
    }
  };

  const handleReplaceExport = async () => {
    if (!file) {
      setError('No file selected');
      return;
    }

    try {
      // Read the file and send it to the API
      const data = await file.arrayBuffer();
      const workbook = read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = utils.sheet_to_json(sheet);

      const response = await fetch('/api/replaceExport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newData: rows }),
      });

      if (!response.ok) {
        throw new Error('Failed to replace export.csv');
      }

      setSuccessMessage('export.csv replaced successfully! Ready for next comparison.');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reset the component
      setFile(null);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error replacing export.csv:', err);
      setError(err.message);
    }
  };

  const handleSort = (field: keyof PriceChange) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Filter price changes
  const filteredPriceChanges = priceChanges.filter((change) => {
    if (priceFilter === 'increases') return parseFloat(change.priceChange) > 0;
    if (priceFilter === 'decreases') return parseFloat(change.priceChange) < 0;
    return true;
  });

  // Sort the price changes
  const sortedPriceChanges = [...filteredPriceChanges].sort((a, b) => {
    let aValue: number | string = a[sortField];
    let bValue: number | string = b[sortField];

    // Convert to numbers for numeric fields
    if (['oldPrice', 'newPrice', 'priceChange', 'percentageChange'].includes(sortField)) {
      aValue = parseFloat(aValue as string);
      bValue = parseFloat(bValue as string);
      
      // For price change and percentage, sort by absolute value
      if (sortField === 'priceChange' || sortField === 'percentageChange') {
        aValue = Math.abs(aValue);
        bValue = Math.abs(bValue);
      }
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate the sorted data
  const totalPages = Math.ceil(sortedPriceChanges.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChanges = sortedPriceChanges.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <button
        onClick={() => setShowFileUpload(!showFileUpload)}
        style={{
          backgroundColor: '#9c27b0',
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '10px',
        }}
      >
        {showFileUpload ? 'Hide Price Comparison' : 'Compare Prices'}
      </button>

      {showFileUpload && (
        <div
          style={{
            backgroundColor: '#1e1e1e',
            padding: '20px',
            borderRadius: '10px',
            marginTop: '10px',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Price Comparison Tool</h3>
          <p style={{ fontSize: '14px', color: '#aaa' }}>
            Upload a new export.csv file to compare prices with the previous version.
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{
              marginBottom: '10px',
              padding: '5px',
              borderRadius: '5px',
              border: '1px solid #555',
              backgroundColor: '#2a2a2a',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          />

          <div style={{ marginTop: '10px' }}>
            <button
              onClick={handleComparePrices}
              disabled={!file || isLoading}
              style={{
                backgroundColor: !file || isLoading ? '#555' : '#2196f3',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: !file || isLoading ? 'not-allowed' : 'pointer',
                marginRight: '10px',
              }}
            >
              {isLoading ? 'Comparing...' : 'Compare Prices'}
            </button>

            {priceChanges.length > 0 && (
              <>
                <button
                  onClick={handleGenerateCsv}
                  style={{
                    backgroundColor: '#4caf50',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginRight: '10px',
                  }}
                >
                  Download Changes CSV
                </button>

                <button
                  onClick={handleReplaceExport}
                  style={{
                    backgroundColor: '#ff9800',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  Replace Old Export File
                </button>
              </>
            )}
          </div>

          {successMessage && (
            <div
              style={{
                backgroundColor: '#4caf50',
                color: '#ffffff',
                padding: '10px',
                marginTop: '10px',
                borderRadius: '5px',
              }}
            >
              {successMessage}
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: '#f44336',
                color: '#ffffff',
                padding: '10px',
                marginTop: '10px',
                borderRadius: '5px',
              }}
            >
              {error}
            </div>
          )}

          {priceChanges.length > 0 && (
            <div style={{ marginTop: '20px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setPriceFilter('all'); setCurrentPage(1); }}
                  style={{
                    backgroundColor: priceFilter === 'all' ? '#9c27b0' : '#424242',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: priceFilter === 'all' ? 'bold' : 'normal',
                  }}
                >
                  All ({priceChanges.length})
                </button>
                <button
                  onClick={() => { setPriceFilter('increases'); setCurrentPage(1); }}
                  style={{
                    backgroundColor: priceFilter === 'increases' ? '#4caf50' : '#424242',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: priceFilter === 'increases' ? 'bold' : 'normal',
                  }}
                >
                  ↑ Increases ({priceChanges.filter(c => parseFloat(c.priceChange) > 0).length})
                </button>
                <button
                  onClick={() => { setPriceFilter('decreases'); setCurrentPage(1); }}
                  style={{
                    backgroundColor: priceFilter === 'decreases' ? '#f44336' : '#424242',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: priceFilter === 'decreases' ? 'bold' : 'normal',
                  }}
                >
                  ↓ Decreases ({priceChanges.filter(c => parseFloat(c.priceChange) < 0).length})
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4>Price Changes ({filteredPriceChanges.length} items)</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '14px' }}>
                    Items per page:
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        marginLeft: '5px',
                        padding: '5px',
                        borderRadius: '5px',
                        backgroundColor: '#2a2a2a',
                        color: '#fff',
                        border: '1px solid #555',
                      }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </label>
                </div>
              </div>
              
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '5px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#333' }}>
                    <th style={tableHeaderStyle} onClick={() => handleSort('productName')}>
                      Product Name {sortField === 'productName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('cardNumber')}>
                      Card Number {sortField === 'cardNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('category')}>
                      Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('set')}>
                      Set {sortField === 'set' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('rarity')}>
                      Rarity {sortField === 'rarity' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('oldPrice')}>
                      Old Price {sortField === 'oldPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('newPrice')}>
                      New Price {sortField === 'newPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('priceChange')}>
                      Change ($) {sortField === 'priceChange' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => handleSort('percentageChange')}>
                      Change (%) {sortField === 'percentageChange' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedChanges.map((change, index) => (
                    <tr
                      key={index}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#2a2a2a' : '#333',
                      }}
                    >
                      <td style={tableCellStyle}>{change.productName}</td>
                      <td style={tableCellStyle}>{change.cardNumber}</td>
                      <td style={tableCellStyle}>{change.category}</td>
                      <td style={tableCellStyle}>{change.set}</td>
                      <td style={tableCellStyle}>{change.rarity}</td>
                      <td style={tableCellStyle}>${change.oldPrice}</td>
                      <td style={tableCellStyle}>${change.newPrice}</td>
                      <td
                        style={{
                          ...tableCellStyle,
                          color: parseFloat(change.priceChange) >= 0 ? '#4caf50' : '#f44336',
                          fontWeight: 'bold',
                        }}
                      >
                        ${change.priceChange}
                      </td>
                      <td
                        style={{
                          ...tableCellStyle,
                          color: parseFloat(change.percentageChange) >= 0 ? '#4caf50' : '#f44336',
                          fontWeight: 'bold',
                        }}
                      >
                        {change.percentageChange}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  style={{
                    backgroundColor: currentPage === 1 ? '#555' : '#1e88e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    backgroundColor: currentPage === 1 ? '#555' : '#1e88e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '0 15px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    backgroundColor: currentPage === totalPages ? '#555' : '#1e88e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    backgroundColor: currentPage === totalPages ? '#555' : '#1e88e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Last
                </button>
              </div>
              
              <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '14px', color: '#aaa' }}>
                Showing {startIndex + 1} to {Math.min(endIndex, priceChanges.length)} of {priceChanges.length} items
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid #555',
  fontWeight: 'bold',
  cursor: 'pointer',
  userSelect: 'none',
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid #555',
};

export default PriceComparisonTable;
