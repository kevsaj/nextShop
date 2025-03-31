import { NextApiRequest, NextApiResponse } from 'next';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { read, utils, write } from 'xlsx';
import path from 'path';
import { fetchAllCollectrProducts } from '../../utils/fetchCollectrProducts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Processing SKUs from CSV...');

    // Ensure the `generated` directory exists
    const generatedDir = path.join(process.cwd(), 'generated');
    if (!existsSync(generatedDir)) {
      mkdirSync(generatedDir);
    }

    // Read the CSV file from the `generated` directory
    const filePath = path.join(generatedDir, 'all_skus.csv');
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = readFileSync(filePath);
    const workbook = read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = utils.sheet_to_json(sheet);

    // Group SKUs by category
    const skuGroups: Record<string, string[]> = {};
    rows.forEach((row: any) => {
      const category = row.Category;
      const sku = row.SKU;
      if (!skuGroups[category]) {
        skuGroups[category] = [];
      }
      skuGroups[category].push(sku);
    });

    console.log('Grouped SKUs by category:', skuGroups);

    // Process each category
    for (const category of Object.keys(skuGroups)) {
      console.log(`Processing category: ${category}`);
      const skus = skuGroups[category];

      // Fetch products for each SKU
      const allProducts: any[] = [];
      for (const sku of skus) {
        const products = await fetchAllCollectrProducts(sku);
        allProducts.push(...products);
      }

      // Generate a CSV file for the category
      const csvRows = allProducts.map((product) => ({
        ID: product.id || '',
        CategoryID: product.categoryId || '',
        CategoryName: product.categoryName || '',
        SetName: product.setName || '',
        ProductName: product.productName || '',
        CardNumber: product.cardNumber || '',
        Rarity: product.rarity || '',
      }));

      const worksheet = utils.json_to_sheet(csvRows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, category);

      const outputFilePath = path.join(generatedDir, `${category}_products.csv`);
      writeFileSync(outputFilePath, write(workbook, { type: 'buffer', bookType: 'csv' }));

      console.log(`CSV file "${category}_products.csv" created successfully!`);
    }

    res.status(200).json({ message: 'CSV files created successfully!' });
  } catch (error) {
    console.error('Error processing SKUs from CSV:', error);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
}