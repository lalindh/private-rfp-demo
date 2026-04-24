const XLSX = require('xlsx');

function normalizeCellValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return String(value).trim();
}

function parseSheet(worksheet, sheetName) {
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false
  });

  const rows = rawRows.map((row, rowIndex) => {
    const normalizedRow = Array.isArray(row)
      ? row.map((cell) => normalizeCellValue(cell))
      : [];

    return {
      rowNumber: rowIndex + 1,
      cells: normalizedRow
    };
  });

  const columnCount = rows.reduce((max, row) => {
    return Math.max(max, Array.isArray(row.cells) ? row.cells.length : 0);
  }, 0);

  return {
    sheetName,
    rowCount: rows.length,
    columnCount,
    rows
  };
}

function parseWorkbook(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('parseWorkbook expected a valid Buffer.');
  }

  let workbook;

  try {
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true
    });
  } catch (error) {
    throw new Error(`Unable to read workbook: ${error instanceof Error ? error.message : String(error)}`);
  }

  const sheetNames = Array.isArray(workbook.SheetNames) ? workbook.SheetNames : [];

  if (!sheetNames.length) {
    return {
      sheetNames: [],
      sheetCount: 0,
      sheets: []
    };
  }

  const sheets = sheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets?.[sheetName];

    if (!worksheet) {
      return {
        sheetName,
        rowCount: 0,
        columnCount: 0,
        rows: []
      };
    }

    return parseSheet(worksheet, sheetName);
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
