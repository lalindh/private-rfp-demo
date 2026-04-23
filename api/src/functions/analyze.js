function buildRequirements(files) {
  const rows = [];

  files.forEach((file, fileIndex) => {
    const role = String(file.role || 'Other');
    const ext = String(file.name || '').split('.').pop().toLowerCase();
    const isFunctionalExcel = role === 'Functional requirements' && (ext === 'xlsx' || ext === 'xls');

    if (isFunctionalExcel) {
      const signals = splitFileNameToSignals(file.name);
      const selectedSignals = signals.slice(0, 4);

      if (!selectedSignals.length) {
        selectedSignals.push(`document ${fileIndex + 1}`);
      }

      selectedSignals.forEach((signal, signalIndex) => {
        const row = buildRequirementRow(file, signal, rows.length + signalIndex);
        row.sourceMode = 'Extracted';
        row.documentRole = role;
        rows.push(row);
      });
      return;
    }

    const signals = splitFileNameToSignals(file.name);
    const selectedSignals = signals.slice(0, 2);

    if (!selectedSignals.length) {
      selectedSignals.push(`document ${fileIndex + 1}`);
    }

    selectedSignals.forEach((signal, signalIndex) => {
      const row = buildRequirementRow(file, signal, rows.length + signalIndex);
      row.sourceMode = 'Inferred';
      row.documentRole = role;
      rows.push(row);
    });
  });

  return rows.slice(0, 18);
}
