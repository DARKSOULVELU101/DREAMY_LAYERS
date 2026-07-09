const { put, list } = require('@vercel/blob');
const XLSX = require('xlsx');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { customerName, contactNo, email, deliveryAddress, cakeType, cakeCategory, weight, quantity, customization, deliveryDate, messageOnCake } = req.body;

    if (!customerName || !contactNo || !deliveryAddress || !cakeType || !cakeCategory || !weight || !quantity || !deliveryDate) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    const orderId = 'DL' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
    const weightNum = parseFloat(weight) || 1;
    let basePrice = 0;
    if (cakeCategory === 'normal') basePrice = 450 * weightNum;
    else if (cakeCategory === 'special') basePrice = 700 * weightNum;
    else if (cakeCategory === 'ice') basePrice = 900 * weightNum;
    if (customization && customization.trim()) basePrice += 200;
    const totalPrice = basePrice * parseInt(quantity);
    const orderDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const orderData = {
      orderId, date: orderDate, customerName, contactNo,
      email: email || '', deliveryAddress, cakeType, cakeCategory,
      weight, quantity, customization: customization || '',
      deliveryDate, messageOnCake: messageOnCake || '', totalPrice
    };

    try {
      await appendToBlobExcel(orderData);
    } catch (blobError) {
      console.error('Blob storage error:', blobError.message);
    }

    const whatsappMsg = encodeURIComponent(
      `New Order!\nOrder ID: ${orderId}\nCustomer: ${customerName}\nContact: ${contactNo}\nAddress: ${deliveryAddress}\nCake: ${cakeType} (${cakeCategory})\nWeight: ${weight}kg x ${quantity}\nDelivery: ${deliveryDate}\nTotal: ₹${totalPrice}\nCustomization: ${customization || 'None'}`
    );

    res.json({
      success: true, message: 'Order placed successfully!',
      orderId, totalPrice,
      whatsappUrl: `https://wa.me/919750147143?text=${whatsappMsg}`
    });
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

async function appendToBlobExcel(orderData) {
  const BLOB_NAME = 'orders.xlsx';
  let workbook;

  try {
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      const buffer = await response.arrayBuffer();
      workbook = XLSX.read(buffer, { type: 'array' });
    } else {
      workbook = XLSX.utils.book_new();
      const data = [['Order ID', 'Date', 'Customer Name', 'Contact No', 'Email', 'Delivery Address',
        'Cake Type', 'Cake Category', 'Weight (kg)', 'Quantity', 'Customization Details',
        'Delivery Date', 'Message on Cake', 'Total Price (INR)', 'Order Status', 'Payment Status']];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, 'Orders');
    }
  } catch (e) {
    workbook = XLSX.utils.book_new();
    const data = [['Order ID', 'Date', 'Customer Name', 'Contact No', 'Email', 'Delivery Address',
      'Cake Type', 'Cake Category', 'Weight (kg)', 'Quantity', 'Customization Details',
      'Delivery Date', 'Message on Cake', 'Total Price (INR)', 'Order Status', 'Payment Status']];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, ws, 'Orders');
  }

  const ws = workbook.Sheets['Orders'];
  const existingData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  existingData.push([
    orderData.orderId, orderData.date, orderData.customerName, orderData.contactNo,
    orderData.email || '-', orderData.deliveryAddress, orderData.cakeType,
    orderData.cakeCategory, orderData.weight, orderData.quantity,
    orderData.customization || '-', orderData.deliveryDate,
    orderData.messageOnCake || '-', orderData.totalPrice, 'Pending', 'Pending'
  ]);
  const newWs = XLSX.utils.aoa_to_sheet(existingData);
  workbook.Sheets['Orders'] = newWs;

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  await put(BLOB_NAME, buffer, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', access: 'public' });
}
