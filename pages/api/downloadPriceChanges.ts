import { NextApiRequest, NextApiResponse } from 'next';
import { utils, write } from 'xlsx';

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
    const { priceChanges } = req.body;

    // Input validation
    if (!priceChanges || !Array.isArray(priceChanges)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    if (priceChanges.length === 0) {
      return res.status(400).json({ error: 'No price changes provided' });
    }

    // Limit number of rows
    if (priceChanges.length > 50000) {
      return res.status(400).json({ error: 'Too many rows. Maximum 50,000 rows allowed.' });
    }

    // Validate data structure
    const requiredFields = ['productName', 'cardNumber', 'oldPrice', 'newPrice', 'priceChange', 'percentageChange'];
    const firstItem = priceChanges[0];
    const hasRequiredFields = requiredFields.every(field => field in firstItem);
    
    if (!hasRequiredFields) {
      return res.status(400).json({ error: 'Invalid price change data structure' });
    }

    // Prepare the data for CSV export
    const csvData = priceChanges.map((change: PriceChange) => ({
      'Product Name': change.productName,
      'Card Number': change.cardNumber,
      'Category': change.category,
      'Set': change.set,
      'Rarity': change.rarity,
      'Old Price': `$${change.oldPrice}`,
      'New Price': `$${change.newPrice}`,
      'Price Change': `$${change.priceChange}`,
      'Percentage Change': `${change.percentageChange}%`,
    }));

    // Create a worksheet from the data
    const worksheet = utils.json_to_sheet(csvData);

    // Create a workbook
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Price Changes');

    // Generate CSV buffer
    const csvBuffer = write(workbook, { type: 'buffer', bookType: 'csv' });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=price_changes_${new Date().toISOString().split('T')[0]}.csv`);

    return res.status(200).send(csvBuffer);
  } catch (error: any) {
    console.error('Error generating CSV:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate CSV' });
  }
}
