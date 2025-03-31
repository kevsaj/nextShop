import { readFileSync, writeFileSync } from 'fs';
import { read, utils, write } from 'xlsx';
import { fetchAllCollectrProducts } from './fetchCollectrProducts';

export async function processSkusFromCsv() {
  try {
    console.log('Processing SKUs from CSV...');

    // Call the API route to process the CSV file
    const response = await fetch('/api/processCsv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to process CSV file');
    }

    const data = await response.json();
    console.log('CSV files created successfully:', data);
  } catch (error) {
    console.error('Error processing SKUs from CSV:', error);
    throw error;
  }
}