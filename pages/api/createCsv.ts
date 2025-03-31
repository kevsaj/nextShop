import { NextApiRequest, NextApiResponse } from 'next';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { utils, write } from 'xlsx';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { skuGroups } = req.body;

    if (!skuGroups || typeof skuGroups !== 'object') {
      return res.status(400).json({ error: 'Invalid SKU groups' });
    }

    // Convert the grouped SKUs into a CSV-friendly format
    const csvData: any[] = [];
    Object.keys(skuGroups).forEach((category) => {
      skuGroups[category].forEach((sku: string) => {
        csvData.push({ Category: category, SKU: sku });
      });
    });

    // Ensure the `generated` directory exists
    const generatedDir = path.join(process.cwd(), 'generated');
    if (!existsSync(generatedDir)) {
      mkdirSync(generatedDir);
    }

    // Save the file to the `generated` directory
    const filePath = path.join(generatedDir, 'all_skus.csv');
    const worksheet = utils.json_to_sheet(csvData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'SKUs');
    writeFileSync(filePath, write(workbook, { type: 'buffer', bookType: 'csv' }));

    res.status(200).json({ message: 'CSV file created successfully!', filePath });
  } catch (error) {
    console.error('Error creating CSV file:', error);
    res.status(500).json({ error: 'Failed to create CSV file' });
  }
}