const { list } = require('@vercel/blob');
const XLSX = require('xlsx');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { blobs } = await list({ prefix: 'orders.xlsx' });
    if (blobs.length === 0) {
      return res.json({ success: true, orders: [] });
    }
    const response = await fetch(blobs[0].url);
    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const ws = workbook.Sheets['Orders'];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    res.json({ success: true, orders: data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading orders' });
  }
};
