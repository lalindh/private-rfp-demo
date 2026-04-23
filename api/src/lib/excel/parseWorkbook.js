const XLSX = require('xlsx');

function normalizeCellValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}

function parseWorkbook(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('parseWorkbook expected a valid Buffer.');
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames || [];

  const sheets = sheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false
    }).map((row, rowIndex) => {
      const normalizedRow = Array.isArray(row)
        ? row.map((cell) => normalizeCellValue(cell))
        : [];

      return {
        rowNumber: rowIndex + 1,
        cells: normalizedRow
      };
    });

    return {
      sheetName,
      rowCount: rows.length,
      rows
    };
  });

  return {
    sheetNames,
    sheetCount: sheetNames.length,
    sheets
  };
}

module.exports = {
  parseWorkbook
};
