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

// Google Sheets serial date → YYYY-MM-DD
function serialToISO(n) {
  const d = new Date((n - 25569) * 86400 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function cellStr(cell) {
  if (!cell || !cell.userEnteredValue) return '';
  const v = cell.userEnteredValue;
  if (v.stringValue !== undefined) return String(v.stringValue);
  if (v.numberValue !== undefined) return String(v.numberValue);
  return '';
}

function cellDate(cell) {
  if (!cell || !cell.userEnteredValue) return '';
  const v = cell.userEnteredValue;
  if (v.numberValue !== undefined) return serialToISO(v.numberValue);
  if (v.stringValue !== undefined) return v.stringValue;
  return '';
}

// Map cell background color → status string
function colorToStatus(bg) {
  if (!bg) return 'not-started';
  const { red = 0, green = 0, blue = 0 } = bg;
  // White / near-white = not started
  if (red > 0.85 && green > 0.85 && blue > 0.85) return 'not-started';
  // Green dominant = done
  if (green > red && green > blue && green > 0.3) return 'done';
  // Red dominant = missed
  if (red > green && red > blue && red > 0.3) return 'missed';
  // Yellow (high red + green) = in-progress
  if (red > 0.7 && green > 0.5 && blue < 0.4) return 'in-progress';
  return 'not-started';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (!checkAuth(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.TASK_SHEET_ID;

  if (!apiKey || !sheetId) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'GOOGLE_SHEETS_API_KEY or TASK_SHEET_ID not configured' }) };
  }

  try {
    // Get all tab names
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=sheets.properties`
    );
    if (!metaRes.ok) throw new Error(`Sheets metadata: ${metaRes.status} ${await metaRes.text()}`);
    const meta = await metaRes.json();
    const tabs = meta.sheets.map(s => s.properties.title);

    // Fetch all tabs with grid data (values + background colors) in one request
    const rangeParams = tabs.map(t => `ranges=${encodeURIComponent(t)}!A1:H300`).join('&');
    const fields = encodeURIComponent(
      'sheets(properties.title,data(rowData(values(userEnteredValue,effectiveFormat(backgroundColor)))))'
    );
    const dataRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=true&${rangeParams}&key=${apiKey}&fields=${fields}`
    );
    if (!dataRes.ok) throw new Error(`Sheets data: ${dataRes.status} ${await dataRes.text()}`);
    const data = await dataRes.json();

    const tasks = [];

    for (const sheet of (data.sheets || [])) {
      const tab = sheet.properties.title;
      const rows = sheet.data?.[0]?.rowData || [];

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i]?.values || [];
        const title = cellStr(cells[3]); // D: Task
        if (!title.trim()) continue;

        const statusBg = cells[2]?.effectiveFormat?.backgroundColor;

        const othersRaw = cellStr(cells[6]); // G: Other Officer(s)

        tasks.push({
          id: `sheet-${tab}-${i}`,
          source: 'sheets',
          tab,
          dateAdded: cellDate(cells[0]),      // A: Date
          deadline: cellDate(cells[1]),        // B: Deadline
          status: colorToStatus(statusBg),
          title: title.trim(),
          description: cellStr(cells[4]).trim(), // E: Description
          leadOfficer: cellStr(cells[5]).trim(), // F: Lead Officer(s)
          otherOfficers: othersRaw
            ? othersRaw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
            : [],
          location: cellStr(cells[7]).trim(),    // H: Location
        });
      }
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ tasks, tabs }),
    };
  } catch (err) {
    console.error('[sheets-tasks]', err.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
