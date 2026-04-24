
function normalizeDocuments(files = [], workbook = null) {
  const normalizedFiles = Array.isArray(files)
    ? files.map((file) => ({
        fileName: String(file?.name || 'Unnamed file'),
        role: String(file?.role || 'Other'),
        type: String(file?.type || ''),
        size: Number(file?.size || 0)
      }))
    : [];

  return {
    opportunity: {
      title: 'Proposal intake',
      sourceFiles: normalizedFiles.map((file) => file.fileName)
    },
    documents: normalizedFiles,
    workbook: workbook && typeof workbook === 'object'
      ? {
          sheetNames: Array.isArray(workbook.sheetNames) ? workbook.sheetNames : [],
          sheetCount: Number(workbook.sheetCount || 0),
          sheets: Array.isArray(workbook.sheets) ? workbook.sheets : []
        }
      : {
          sheetNames: [],
          sheetCount: 0,
          sheets: []
        }
  };
}

module.exports = {
  normalizeDocuments
};
