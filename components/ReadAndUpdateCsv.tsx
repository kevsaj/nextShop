import React, { useState } from 'react';
import { read, utils, writeFile } from 'xlsx';
import { fetchCollectrProductDetails } from '../utils/fetchCollectrProductDetails';

const ReadAndUpdateCsv: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null); // Clear any previous errors
    setSuccessMessage(null); // Clear any previous success messages
  };

  const handleProcessCsv = async () => {
    if (!file) {
      setError('No file selected');
      return;
    }

    setIsLoading(true);
    try {
      // Read the CSV file
      const data = await file.arrayBuffer();
      const workbook = read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = utils.sheet_to_json(sheet);

      console.log('CSV Rows:', rows);

      // Limit to the first 200 rows for updating
      const rowsToUpdate = rows.slice(0, 200);

      console.log('Rows to Update (First 200):', rowsToUpdate);

      // Fetch product details for the first 200 rows
      const updatedRows = await Promise.all(
        rowsToUpdate.map(async (row: any) => {
          try {
            const productId = row.ID; // Assuming the ID column exists in the CSV
            if (!productId) {
              throw new Error('Missing product ID');
            }

            const productDetails = await fetchCollectrProductDetails(productId);

            // Add new columns to the row
            return {
              ...row,
              MarketPrice: productDetails.marketPrice?.[0]?.price || 'N/A',
              PriceType: productDetails.marketPrice?.[0]?.type || 'N/A',
            };
          } catch (error) {
            console.error('Error fetching product details:', error);
            return { ...row, MarketPrice: 'Error', PriceType: 'Error' };
          }
        })
      );

      // Merge updated rows back into the original rows
      const finalRows = [...updatedRows, ...rows.slice(200)];

      // Extract the original file name without the extension
      const originalFileName = file.name.split('.').slice(0, -1).join('.');
      const updatedFileName = `${originalFileName}_updated.csv`;

      // Convert final rows to a new CSV file
      const newSheet = utils.json_to_sheet(finalRows);
      const newWorkbook = utils.book_new();
      utils.book_append_sheet(newWorkbook, newSheet, 'Updated Data');
      writeFile(newWorkbook, updatedFileName);

      setSuccessMessage(`CSV file "${updatedFileName}" updated and downloaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error processing CSV file:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <button
        onClick={() => setShowFileUpload(!showFileUpload)}
        style={{
          backgroundColor: '#3f51b5', // Unique blue color for the button
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        {showFileUpload ? 'Hide File Upload' : 'Show File Upload'}
      </button>

      {showFileUpload && (
        <div>
          <h2>Upload and Update CSV</h2>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{
              margin: '20px 0',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '5px',
            }}
          />
          {file && (
            <button
              onClick={handleProcessCsv}
              style={{
                backgroundColor: '#43a047',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '10px',
              }}
            >
              Go
            </button>
          )}
          {isLoading && (
            <div style={{ marginTop: '20px' }}>
              <div className="spinner" />
              <p style={{ color: '#ffffff' }}>Processing... Please wait.</p>
            </div>
          )}
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
        </div>
      )}
    </div>
  );
};

export default ReadAndUpdateCsv;