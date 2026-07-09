const { promises: fs } = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const customersDir = path.join(process.cwd(), 'public', 'images', 'customers');
  try {
    const files = await fs.readdir(customersDir);
    const photos = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    res.json({ success: true, photos: photos.map(f => `/images/customers/${f}`) });
  } catch (error) {
    res.json({ success: true, photos: [] });
  }
};
