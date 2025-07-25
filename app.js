const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const customers = {};
const loans = {};
const transactions = {};
const uuid = () => Math.random().toString(36).substring(2, 10);

// Home Page with HTML UI
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Bank System</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    input, select, button { margin: 5px; padding: 5px; }
    .section { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Bank Loan System</h1>

  <div class="section">
    <h2>LEND</h2>
    <form onsubmit="lend(); return false;">
      <input id="customer_id" placeholder="Customer ID">
      <input id="amount" type="number" placeholder="Loan Amount">
      <input id="period" type="number" placeholder="Loan Period (years)">
      <input id="rate" type="number" placeholder="Interest Rate (%)">
      <button type="submit">Submit</button>
    </form>
  </div>

  <div class="section">
    <h2>PAYMENT</h2>
    <form onsubmit="pay(); return false;">
      <input id="loan_id_pay" placeholder="Loan ID">
      <input id="pay_amount" type="number" placeholder="Amount">
      <select id="pay_type">
        <option value="EMI">EMI</option>
        <option value="LUMP_SUM">LUMP_SUM</option>
      </select>
      <button type="submit">Pay</button>
    </form>
  </div>

  <div class="section">
    <h2>LEDGER</h2>
    <form onsubmit="ledger(); return false;">
      <input id="loan_id_ledger" placeholder="Loan ID">
      <button type="submit">Check</button>
    </form>
  </div>

  <div class="section">
    <h2>ACCOUNT OVERVIEW</h2>
    <form onsubmit="overview(); return false;">
      <input id="customer_id_overview" placeholder="Customer ID">
      <button type="submit">Check</button>
    </form>
  </div>

  <script>
    async function lend() {
      const res = await fetch('/lend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: document.getElementById('customer_id').value,
          amount: parseFloat(document.getElementById('amount').value),
          period: parseInt(document.getElementById('period').value),
          rate: parseFloat(document.getElementById('rate').value)
        })
      });
      const data = await res.json();
      window.open('/ledger/' + data.loanId, '_blank');
    }

    async function pay() {
      const loanId = document.getElementById('loan_id_pay').value;
      const res = await fetch('/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          amount: parseFloat(document.getElementById('pay_amount').value),
          type: document.getElementById('pay_type').value
        })
      });
      window.open('/ledger/' + loanId, '_blank');
    }

    function ledger() {
      const loanId = document.getElementById('loan_id_ledger').value;
      window.open('/ledger/' + loanId, '_blank');
    }

    function overview() {
      const customerId = document.getElementById('customer_id_overview').value;
      window.open('/overview/' + customerId, '_blank');
    }
  </script>
</body>
</html>
  `);
});

// LEND API
app.post('/lend', (req, res) => {
  const { customerId, amount, period, rate } = req.body;
  const interest = (amount * period * rate) / 100;
  const total = amount + interest;
  const emi = Math.ceil(total / (period * 12));
  const loanId = uuid();

  loans[loanId] = {
    loanId,
    customerId,
    principal: amount,
    interest,
    total,
    emi,
    periodMonths: period * 12,
    paid: 0
  };

  transactions[loanId] = [];

  if (!customers[customerId]) customers[customerId] = { loans: [] };
  customers[customerId].loans.push(loanId);

  res.json({ loanId, totalAmount: total, emi });
});

// PAYMENT API
app.post('/payment', (req, res) => {
  const { loanId, amount, type } = req.body;
  if (!loans[loanId]) return res.status(404).json({ error: 'Loan not found' });

  loans[loanId].paid += amount;
  transactions[loanId].push({ type, amount, date: new Date().toISOString() });

  res.json({ status: 'Payment recorded', totalPaid: loans[loanId].paid });
});

// LEDGER API
app.get('/ledger/:loanId', (req, res) => {
  const loanId = req.params.loanId;
  if (!loans[loanId]) return res.status(404).json({ error: 'Loan not found' });

  const loan = loans[loanId];
  const balance = loan.total - loan.paid;
  const emiLeft = Math.max(Math.ceil(balance / loan.emi), 0);

  res.json({
    loanId,
    transactions: transactions[loanId],
    balance,
    emi: loan.emi,
    emiLeft
  });
});

// OVERVIEW API
app.get('/overview/:customerId', (req, res) => {
  const customerId = req.params.customerId;
  if (!customers[customerId]) return res.status(404).json({ error: 'Customer not found' });

  const result = customers[customerId].loans.map(loanId => {
    const loan = loans[loanId];
    const balance = loan.total - loan.paid;
    const emiLeft = Math.max(Math.ceil(balance / loan.emi), 0);
    return {
      loanId,
      principal: loan.principal,
      total: loan.total,
      interest: loan.interest,
      emi: loan.emi,
      paid: loan.paid,
      emiLeft
    };
  });

  res.json(result);
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Bank system running at http://localhost:${PORT}`);
});
