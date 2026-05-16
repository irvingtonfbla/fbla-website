const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

function checkAuth(event) {
  const auth = event.headers.authorization || '';
  const pw = auth.replace('Bearer ', '');
  return pw && pw === process.env.ADMIN_PASSWORD;
}

function toNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[$,]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function str(v) {
  return String(v == null ? '' : v).trim();
}

function isSection(label) {
  const l = label.toLowerCase();
  return (
    l.includes('total revenue') ||
    l === 'expenses' ||
    l.includes('total expenses') ||
    l.includes('current balance') ||
    l.includes('column 1') // header meta-row
  );
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (!checkAuth(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.BUDGET_SHEET_ID;

  if (!apiKey || !sheetId) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'GOOGLE_SHEETS_API_KEY or BUDGET_SHEET_ID not configured' }) };
  }

  try {
    // Get all tab names
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=sheets.properties`
    );
    if (!metaRes.ok) throw new Error(`Sheets metadata: ${metaRes.status}`);
    const meta = await metaRes.json();
    const tabs = meta.sheets.map(s => s.properties.title);

    const result = {};

    for (const tab of tabs) {
      const valRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}?key=${apiKey}&valueRenderOption=UNFORMATTED_VALUE`
      );
      if (!valRes.ok) continue;
      const { values: rows = [] } = await valRes.json();

      const revenue = [];
      const expenses = [];
      let section = 'revenue';
      let totalRevenue = null;
      let totalExpenses = null;
      let currentBalance = null;

      for (const row of rows) {
        const label = str(row[0]);
        const ll = label.toLowerCase();

        if (ll.includes('total revenue')) {
          totalRevenue = { estimated: toNum(row[5]), actual: toNum(row[6]) };
          continue;
        }
        if (ll === 'expenses') {
          section = 'expenses';
          continue;
        }
        if (ll.includes('total expenses')) {
          totalExpenses = { estimated: toNum(row[5]), actual: toNum(row[6]) };
          continue;
        }
        if (ll.includes('current balance')) {
          currentBalance = { estimated: toNum(row[5]), actual: toNum(row[6]) };
          continue;
        }
        if (isSection(label)) continue;

        const item = str(row[2]);
        if (!item || item.toLowerCase() === 'item') continue;

        const entry = {
          date: str(row[1]),
          item,
          price: toNum(row[3]),
          count: toNum(row[4]),
          estimated: toNum(row[5]),
          actual: toNum(row[6]),
          submittedBy: str(row[7]),
          mfPaForm: str(row[8]),
          mfPaNotes: str(row[9]),
          personWithForm: str(row[10]),
        };

        if (section === 'expenses') expenses.push(entry);
        else revenue.push(entry);
      }

      result[tab] = { revenue, expenses, totalRevenue, totalExpenses, currentBalance };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('[sheets-budget]', err.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
