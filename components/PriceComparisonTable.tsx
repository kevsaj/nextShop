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
  const [minPriceDiff, setMinPriceDiff] = useState<string>('0.50');

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
      setMinPriceDiff('0.50');
      
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
    if (filteredPriceChanges.length === 0) {
      setError('No price changes to export with current filters');
      return;
    }

    try {
      const response = await fetch('/api/downloadPriceChanges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceChanges: filteredPriceChanges }),
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
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error ${response.status}`);
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
  const minDiff = parseFloat(minPriceDiff) || 0;
  const filteredPriceChanges = priceChanges.filter((change) => {
    const absChange = Math.abs(parseFloat(change.priceChange));
    if (absChange < minDiff) return false;
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
          background: 'linear-gradient(135deg, #7b1fa2, #9c27b0)',
          color: '#ffffff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: 600,
          letterSpacing: '0.3px',
          boxShadow: '0 2px 8px rgba(156,39,176,0.4)',
          transition: 'opacity 0.2s',
        }}
      >
        {showFileUpload ? '✕ Hide Price Comparison' : '📊 Compare Prices'}
      </button>

      {showFileUpload && (
        <div style={{
          backgroundColor: '#1a1a2e',
          border: '1px solid #2d2d44',
          padding: '28px',
          borderRadius: '14px',
          marginTop: '14px',
        }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: '#e0e0e0' }}>
              Price Comparison Tool
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
              Upload a new export.csv to compare market prices against the saved baseline.
            </p>
          </div>

          {/* Upload area */}
          <div style={{
            border: '2px dashed #3d3d5c',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px',
            backgroundColor: '#16162a',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2d2d44',
              color: '#c0c0d0',
              padding: '9px 18px',
              borderRadius: '7px',
              cursor: 'pointer',
              fontSize: '14px',
              border: '1px solid #444',
            }}>
              📁 Choose CSV file
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
            <span style={{ fontSize: '14px', color: file ? '#c0c0d0' : '#555' }}>
              {file ? `✓ ${file.name}` : 'No file selected'}
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button
              onClick={handleComparePrices}
              disabled={!file || isLoading}
              style={{
                background: !file || isLoading ? '#333' : 'linear-gradient(135deg, #1565c0, #1e88e5)',
                color: !file || isLoading ? '#666' : '#fff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '8px',
                cursor: !file || isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: !file || isLoading ? 'none' : '0 2px 8px rgba(30,136,229,0.4)',
              }}
            >
              {isLoading ? '⏳ Comparing...' : '🔍 Compare Prices'}
            </button>

            {priceChanges.length > 0 && (
              <>
                <button
                  onClick={handleGenerateCsv}
                  style={{
                    background: 'linear-gradient(135deg, #2e7d32, #43a047)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(67,160,71,0.4)',
                  }}
                >
                  ⬇ Download CSV
                </button>
                <button
                  onClick={handleReplaceExport}
                  style={{
                    background: 'linear-gradient(135deg, #e65100, #ff9800)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(255,152,0,0.4)',
                  }}
                >
                  🔄 Save as New Baseline
                </button>
              </>
            )}
          </div>

          {/* Success / Error banners */}
          {successMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1b3a1f',
              border: '1px solid #2e7d32',
              color: '#81c784',
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: '8px',
              fontSize: '14px',
            }}>
              ✓ {successMessage}
            </div>
          )}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#3b1a1a',
              border: '1px solid #c62828',
              color: '#ef9a9a',
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: '8px',
              fontSize: '14px',
            }}>
              ✕ {error}
            </div>
          )}

          {/* Results section */}
          {priceChanges.length > 0 && (
            <div style={{ marginTop: '8px' }}>

              {/* Stats bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
              }}>
                {[
                  { label: 'Total Changes', value: priceChanges.length, color: '#9c27b0' },
                  { label: 'Increases', value: priceChanges.filter(c => parseFloat(c.priceChange) > 0).length, color: '#43a047' },
                  { label: 'Decreases', value: priceChanges.filter(c => parseFloat(c.priceChange) < 0).length, color: '#e53935' },
                  { label: 'Showing', value: filteredPriceChanges.length, color: '#1e88e5' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    backgroundColor: '#16162a',
                    border: `1px solid ${color}44`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Filters row */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                marginBottom: '16px',
                backgroundColor: '#16162a',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid #2d2d44',
              }}>
                {/* Direction filter group */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Direction
                  </span>
                  <div style={{
                    display: 'flex',
                    backgroundColor: '#0e0e1e',
                    border: '1px solid #2d2d44',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}>
                    {([
                      { key: 'all',       label: 'All',        activeColor: '#6a1b9a', activeBg: 'linear-gradient(135deg,#4a148c,#7b1fa2)' },
                      { key: 'increases', label: '↑ Up',       activeColor: '#2e7d32', activeBg: 'linear-gradient(135deg,#1b5e20,#2e7d32)' },
                      { key: 'decreases', label: '↓ Down',     activeColor: '#c62828', activeBg: 'linear-gradient(135deg,#b71c1c,#c62828)' },
                    ] as const).map(({ key, label, activeBg }, i, arr) => {
                      const isActive = priceFilter === key;
                      return (
                        <button
                          key={key}
                          onClick={() => { setPriceFilter(key); setCurrentPage(1); }}
                          style={{
                            background: isActive ? activeBg : 'transparent',
                            color: isActive ? '#fff' : '#666',
                            border: 'none',
                            borderRight: i < arr.length - 1 ? '1px solid #2d2d44' : 'none',
                            padding: '7px 18px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: isActive ? 700 : 400,
                            letterSpacing: '0.2px',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '44px', backgroundColor: '#2d2d44', alignSelf: 'flex-end', marginBottom: '1px' }} />

                {/* Min change input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Min Change
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#0e0e1e',
                    border: '1px solid #2d2d44',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    height: '34px',
                  }}>
                    <span style={{
                      padding: '0 10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#555',
                      backgroundColor: '#0e0e1e',
                      borderRight: '1px solid #2d2d44',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minPriceDiff}
                      onChange={(e) => { setMinPriceDiff(e.target.value); setCurrentPage(1); }}
                      style={{
                        width: '70px',
                        padding: '0 10px',
                        height: '100%',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#e0e0e0',
                        fontSize: '13px',
                        fontWeight: 500,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Per page — pushed to right */}
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Per Page
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    style={{
                      padding: '0 10px',
                      height: '34px',
                      borderRadius: '8px',
                      border: '1px solid #2d2d44',
                      backgroundColor: '#0e0e1e',
                      color: '#e0e0e0',
                      fontSize: '13px',
                      fontWeight: 500,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #2d2d44' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#16162a' }}>
                      {([
                        ['productName', 'Product Name'],
                        ['cardNumber', 'Card #'],
                        ['category', 'Category'],
                        ['set', 'Set'],
                        ['rarity', 'Rarity'],
                        ['oldPrice', 'Old Price'],
                        ['newPrice', 'New Price'],
                        ['priceChange', 'Change ($)'],
                        ['percentageChange', 'Change (%)'],
                      ] as [keyof PriceChange, string][]).map(([field, label]) => (
                        <th
                          key={field}
                          onClick={() => handleSort(field)}
                          style={{
                            padding: '12px 14px',
                            textAlign: 'center',
                            color: sortField === field ? '#bb86fc' : '#888',
                            fontWeight: 600,
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            cursor: 'pointer',
                            borderBottom: '2px solid #2d2d44',
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                          }}
                        >
                          {label} {sortField === field && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedChanges.map((change, index) => {
                      const isIncrease = parseFloat(change.priceChange) > 0;
                      return (
                        <tr
                          key={index}
                          style={{
                            backgroundColor: index % 2 === 0 ? '#1a1a2e' : '#16162a',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#252540')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#1a1a2e' : '#16162a')}
                        >
                          <td style={cellStyle}>{change.productName}</td>
                          <td style={{ ...cellStyle, fontFamily: 'monospace', color: '#bb86fc' }}>{change.cardNumber}</td>
                          <td style={cellStyle}>{change.category}</td>
                          <td style={cellStyle}>{change.set}</td>
                          <td style={{ ...cellStyle }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              backgroundColor: '#2d2d44',
                              color: '#c0c0d0',
                            }}>
                              {change.rarity}
                            </span>
                          </td>
                          <td style={{ ...cellStyle, color: '#aaa' }}>${change.oldPrice}</td>
                          <td style={{ ...cellStyle, color: '#e0e0e0', fontWeight: 600 }}>${change.newPrice}</td>
                          <td style={{ ...cellStyle, fontWeight: 700, color: isIncrease ? '#66bb6a' : '#ef5350' }}>
                            {isIncrease ? '+' : ''}${change.priceChange}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, color: isIncrease ? '#66bb6a' : '#ef5350' }}>
                            {isIncrease ? '+' : ''}{change.percentageChange}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                marginTop: '16px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}>
                {[
                  { label: '« First', page: 1, disabled: currentPage === 1 },
                  { label: '‹ Prev', page: currentPage - 1, disabled: currentPage === 1 },
                ].map(({ label, page, disabled }) => (
                  <button key={label} onClick={() => handlePageChange(page)} disabled={disabled} style={paginationBtnStyle(disabled)}>
                    {label}
                  </button>
                ))}

                <span style={{
                  padding: '6px 16px',
                  backgroundColor: '#2d2d44',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#c0c0d0',
                }}>
                  Page {currentPage} of {totalPages}
                </span>

                {[
                  { label: 'Next ›', page: currentPage + 1, disabled: currentPage === totalPages },
                  { label: 'Last »', page: totalPages, disabled: currentPage === totalPages },
                ].map(({ label, page, disabled }) => (
                  <button key={label} onClick={() => handlePageChange(page)} disabled={disabled} style={paginationBtnStyle(disabled)}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#555', marginTop: '8px' }}>
                Showing {startIndex + 1}–{Math.min(endIndex, filteredPriceChanges.length)} of {filteredPriceChanges.length} results
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const cellStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid #2d2d44',
  color: '#c0c0d0',
  verticalAlign: 'middle',
  textAlign: 'center',
};

const paginationBtnStyle = (disabled: boolean): React.CSSProperties => ({
  backgroundColor: disabled ? '#1e1e30' : '#2d2d44',
  color: disabled ? '#444' : '#c0c0d0',
  border: '1px solid #3d3d5c',
  padding: '6px 14px',
  borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '13px',
  fontWeight: 500,
});

export default PriceComparisonTable;
