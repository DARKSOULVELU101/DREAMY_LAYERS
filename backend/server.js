const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const EXCEL_PATH = path.join(__dirname, 'orders.xlsx');

function getOrderNumber() {
  return 'DL' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
}

function getPrice(cakeType, cakeCategory, weight, customization) {
  const weightNum = parseFloat(weight) || 1;
  let basePrice = 0;
  if (cakeCategory === 'normal') {
    basePrice = 450 * weightNum;
  } else if (cakeCategory === 'special') {
    basePrice = 700 * weightNum;
  } else if (cakeCategory === 'ice') {
    basePrice = 900 * weightNum;
  }
  if (customization && customization.trim()) {
    basePrice += 200;
  }
  return basePrice;
}

function initExcel() {
  let workbook;
  try {
    workbook = XLSX.readFile(EXCEL_PATH);
  } catch (e) {
    workbook = XLSX.utils.book_new();
    const data = [
      ['Order ID', 'Date', 'Customer Name', 'Contact No', 'Email', 'Delivery Address',
       'Cake Type', 'Cake Category', 'Weight (kg)', 'Quantity', 'Customization Details',
       'Delivery Date', 'Message on Cake', 'Total Price (INR)', 'Order Status', 'Payment Status']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, ws, 'Orders');
    XLSX.writeFile(workbook, EXCEL_PATH);
  }
  return workbook;
}

function appendToExcel(orderData) {
  const workbook = initExcel();
  const ws = workbook.Sheets['Orders'];
  const existingData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const newRow = [
    orderData.orderId,
    orderData.date,
    orderData.customerName,
    orderData.contactNo,
    orderData.email || '-',
    orderData.deliveryAddress,
    orderData.cakeType,
    orderData.cakeCategory,
    orderData.weight,
    orderData.quantity,
    orderData.customization || '-',
    orderData.deliveryDate,
    orderData.messageOnCake || '-',
    orderData.totalPrice,
    'Pending',
    'Pending'
  ];
  existingData.push(newRow);
  const newWs = XLSX.utils.aoa_to_sheet(existingData);
  workbook.Sheets['Orders'] = newWs;
  XLSX.writeFile(workbook, EXCEL_PATH);
}

function sendEmailNotification(order) {
  const EMAIL_PASS = process.env.EMAIL_APP_PASSWORD || '';
  const EMAIL_USER = 'babusoniya773@gmail.com';

  if (!EMAIL_PASS) {
    console.log('Email not sent - configure EMAIL_APP_PASSWORD env var');
    console.log('Order notification:', order.orderId, order.customerName);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });

  const mailOptions = {
    from: EMAIL_USER,
    to: EMAIL_USER,
    subject: `New Order Received - ${order.orderId}`,
    html: `
      <h2 style="color:#c17a2b;">DREAMY_LAYERS - New Order</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Order ID</td><td style="padding:8px;border:1px solid #ddd;">${order.orderId}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Customer</td><td style="padding:8px;border:1px solid #ddd;">${order.customerName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Contact</td><td style="padding:8px;border:1px solid #ddd;">${order.contactNo}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">${order.email || '-'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Address</td><td style="padding:8px;border:1px solid #ddd;">${order.deliveryAddress}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Cake Type</td><td style="padding:8px;border:1px solid #ddd;">${order.cakeType}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Category</td><td style="padding:8px;border:1px solid #ddd;">${order.cakeCategory}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Weight</td><td style="padding:8px;border:1px solid #ddd;">${order.weight} kg</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Quantity</td><td style="padding:8px;border:1px solid #ddd;">${order.quantity}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Delivery Date</td><td style="padding:8px;border:1px solid #ddd;">${order.deliveryDate}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Total Price</td><td style="padding:8px;border:1px solid #ddd;">₹${order.totalPrice}</td></tr>
      </table>
    `
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) console.error('Email error:', error.message);
    else console.log('Email sent for order:', order.orderId);
  });
}

app.post('/api/place-order', (req, res) => {
  try {
    const { customerName, contactNo, email, deliveryAddress, cakeType, cakeCategory, weight, quantity, customization, deliveryDate, messageOnCake } = req.body;

    if (!customerName || !contactNo || !deliveryAddress || !cakeType || !cakeCategory || !weight || !quantity || !deliveryDate) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    const orderId = getOrderNumber();
    const totalPrice = getPrice(cakeType, cakeCategory, weight, customization) * parseInt(quantity);
    const orderDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const orderData = {
      orderId,
      date: orderDate,
      customerName,
      contactNo,
      email: email || '',
      deliveryAddress,
      cakeType,
      cakeCategory,
      weight,
      quantity,
      customization: customization || '',
      deliveryDate,
      messageOnCake: messageOnCake || '',
      totalPrice
    };

    appendToExcel(orderData);

    sendEmailNotification(orderData);

    const whatsappMsg = encodeURIComponent(
      `New Order!\nOrder ID: ${orderId}\nCustomer: ${customerName}\nContact: ${contactNo}\nAddress: ${deliveryAddress}\nCake: ${cakeType} (${cakeCategory})\nWeight: ${weight}kg x ${quantity}\nDelivery: ${deliveryDate}\nTotal: ₹${totalPrice}\nCustomization: ${customization || 'None'}`
    );

    res.json({
      success: true,
      message: 'Order placed successfully!',
      orderId,
      totalPrice,
      whatsappUrl: `https://wa.me/919750147143?text=${whatsappMsg}`
    });
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const workbook = initExcel();
    const ws = workbook.Sheets['Orders'];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    res.json({ success: true, orders: data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading orders' });
  }
});

app.get('/api/customer-photos', (req, res) => {
  const fs = require('fs');
  const customersDir = path.join(__dirname, '..', 'public', 'images', 'customers');
  try {
    const files = fs.readdirSync(customersDir).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    res.json({ success: true, photos: files.map(f => `/images/customers/${f}`) });
  } catch (error) {
    res.json({ success: true, photos: [] });
  }
});

initExcel();

app.listen(PORT, () => {
  console.log(`DREAMY_LAYERS server running at http://localhost:${PORT}`);
});
