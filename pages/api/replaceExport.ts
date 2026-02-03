import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { utils, write } from 'xlsx';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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

    // Validate data structure
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

    // Limit number of rows
    if (newData.length > 50000) {
      return res.status(400).json({ error: 'Too many rows. Maximum 50,000 rows allowed.' });
    }

    // Path validation - ensure we only write to the test folder
    const testDir = path.join(process.cwd(), 'test');
    const exportFilePath = path.join(testDir, 'export.csv');
    
    // Verify the resolved path is actually within the test directory
    const resolvedPath = path.resolve(exportFilePath);
    const resolvedTestDir = path.resolve(testDir);
    
    if (!resolvedPath.startsWith(resolvedTestDir)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create a worksheet from the new data
    const worksheet = utils.json_to_sheet(newData);

    // Create a workbook
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Generate CSV buffer
    const csvBuffer = write(workbook, { type: 'buffer', bookType: 'csv' });

    // Write the new CSV file, replacing the old one
    fs.writeFileSync(exportFilePath, csvBuffer);

    return res.status(200).json({ 
      message: 'export.csv replaced successfully',
      path: exportFilePath 
    });
  } catch (error: any) {
    console.error('Error replacing export.csv:', error);
    return res.status(500).json({ error: error.message || 'Failed to replace export.csv' });
  }
}
