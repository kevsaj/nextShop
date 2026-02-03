import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { read, utils } from 'xlsx';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface ExportRow {
  'Portfolio Name': string;
  'Category': string;
  'Set': string;
  'Product Name': string;
  'Card Number': string;
  'Rarity': string;
  'Variance': string;
  'Grade': string;
  'Card Condition': string;
  'Average Cost Paid': string;
  'Quantity': string;
  'Market Price (As of 2026-02-03)': string;
  'Price Override': string;
  'Watchlist': string;
  'Date Added': string;
  'Notes': string;
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { newData } = req.body;

    // Input validation
    if (!newData || !Array.isArray(newData)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // Validate data structure - check if it looks like CSV data
    if (newData.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Validate that first row has expected columns
    const firstRow = newData[0];
    const requiredColumns = ['Product Name', 'Card Number'];
    const hasRequiredColumns = requiredColumns.every(col => col in firstRow);
    
    if (!hasRequiredColumns) {
      return res.status(400).json({ error: 'Invalid CSV format: missing required columns' });
    }

    // Limit number of rows to prevent memory issues
    if (newData.length > 50000) {
      return res.status(400).json({ error: 'Too many rows. Maximum 50,000 rows allowed.' });
    }

    // Read the existing export.csv file from the test folder
    const oldFilePath = path.join(process.cwd(), 'test', 'export.csv');

    if (!fs.existsSync(oldFilePath)) {
      return res.status(404).json({ error: 'Previous export.csv file not found' });
    }

    const oldFileContent = fs.readFileSync(oldFilePath);
    const oldWorkbook = read(oldFileContent, { type: 'buffer' });
    const oldSheetName = oldWorkbook.SheetNames[0];
    const oldSheet = oldWorkbook.Sheets[oldSheetName];
    const oldData = utils.sheet_to_json(oldSheet) as ExportRow[];

    // Create a map of old prices - for duplicate keys, store in an array
    const oldPricesMap = new Map<string, any[]>();
    oldData.forEach((row) => {
      const productName = String(row['Product Name'] || '').trim();
      const cardNumber = String(row['Card Number'] || '').trim();
      const set = String(row['Set'] || '').trim();
      const variance = String(row['Variance'] || '').trim();
      const grade = String(row['Grade'] || '').trim();
      const condition = String(row['Card Condition'] || '').trim();
      const dateAdded = String(row['Date Added'] || '').trim();
      const quantity = String(row['Quantity'] || '').trim();
      const key = `${productName}|${cardNumber}|${set}|${variance}|${grade}|${condition}|${dateAdded}|${quantity}`;
      
      if (!oldPricesMap.has(key)) {
        oldPricesMap.set(key, []);
      }
      oldPricesMap.get(key)!.push(row);
    });

    // Compare prices and find changes
    const priceChanges: PriceChange[] = [];
    const usedOldRows = new Map<string, number>(); // Track which old rows we've used

    newData.forEach((newRow: any) => {
      const productName = String(newRow['Product Name'] || '').trim();
      const cardNumber = String(newRow['Card Number'] || '').trim();
      const set = String(newRow['Set'] || '').trim();
      const variance = String(newRow['Variance'] || '').trim();
      const grade = String(newRow['Grade'] || '').trim();
      const condition = String(newRow['Card Condition'] || '').trim();
      const dateAdded = String(newRow['Date Added'] || '').trim();
      const quantity = String(newRow['Quantity'] || '').trim();
      const key = `${productName}|${cardNumber}|${set}|${variance}|${grade}|${condition}|${dateAdded}|${quantity}`;
      
      const oldRows = oldPricesMap.get(key);
      if (!oldRows || oldRows.length === 0) return;
      
      // Get the next unused row for this key
      const usedIndex = usedOldRows.get(key) || 0;
      if (usedIndex >= oldRows.length) return;
      
      const oldRow = oldRows[usedIndex];
      usedOldRows.set(key, usedIndex + 1);

      if (oldRow) {
        // Get the market price column (it may have a different date in the header)
        const oldPriceKey = Object.keys(oldRow).find(k => k.startsWith('Market Price'));
        const newPriceKey = Object.keys(newRow).find((k: string) => k.startsWith('Market Price'));

        if (oldPriceKey && newPriceKey) {
          const oldPriceValue = String(oldRow[oldPriceKey] || '0').trim();
          const newPriceValue = String(newRow[newPriceKey] || '0').trim();
          
          const oldPrice = parseFloat(oldPriceValue) || 0;
          const newPrice = parseFloat(newPriceValue) || 0;

          // Debug logging
          if (Math.abs(oldPrice - newPrice) > 0.001) {
            console.log('Price difference found:', {
              product: newRow['Product Name'],
              cardNumber: newRow['Card Number'],
              oldPriceValue,
              newPriceValue,
              oldPrice,
              newPrice,
              difference: newPrice - oldPrice
            });
          }

          // Only include if there's a meaningful price change (more than 0.001 difference to avoid floating point issues)
          if (Math.abs(oldPrice - newPrice) > 0.001) {
            const priceChange = newPrice - oldPrice;
            const percentageChange = oldPrice !== 0 ? ((priceChange / oldPrice) * 100) : 0;

            priceChanges.push({
              productName: newRow['Product Name'],
              cardNumber: newRow['Card Number'],
              category: newRow['Category'] || '',
              set: newRow['Set'] || '',
              rarity: newRow['Rarity'] || '',
              oldPrice: oldPrice.toFixed(2),
              newPrice: newPrice.toFixed(2),
              priceChange: priceChange.toFixed(2),
              percentageChange: percentageChange.toFixed(2),
            });
          }
        }
      }
    });

    // Sort by absolute price change (highest changes first)
    priceChanges.sort((a, b) => {
      return Math.abs(parseFloat(b.priceChange)) - Math.abs(parseFloat(a.priceChange));
    });

    return res.status(200).json({ priceChanges });
  } catch (error: any) {
    console.error('Error comparing prices:', error);
    return res.status(500).json({ error: error.message || 'Failed to compare prices' });
  }
}
