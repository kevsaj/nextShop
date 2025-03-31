import { NextApiRequest, NextApiResponse } from 'next';
import { createReadStream } from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const filePath = path.join(process.cwd(), 'generated', 'all_skus.csv');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="all_skus.csv"');

  const fileStream = createReadStream(filePath);
  fileStream.pipe(res);
}