const { app } = require('@azure/functions');

function detectWorkstream(files) {
  const names = files.map(file => (file.name || '').toLowerCase()).join(' ');

  if (names.includes('finance') || names.includes('erp') || names.includes('d365')) {
    return 'Dynamics 365 / ERP';
  }

  if (names.includes('crm') || names.includes('sales') || names.includes('customer')) {
    return 'CRM / Customer Engagement';
  }

  if (names.includes('data') || names.includes('bi') || names.includes('analytics')) {
    return 'Data & Analytics';
  }

  return 'General proposal intake';
}

function buildReadiness(files) {
  if (files.length >= 3) return 'Draft can be prepared';
  if (files.length === 2) return 'Good basis for draft';
  return 'More source material recommended';
}

function buildExecutiveSummary(files, workstream, readiness) {
  return `The uploaded material indicates a ${workstream} opportunity with ${files.length} source document${files.length > 1 ? 's' : ''}. Current readiness is assessed as "${readiness}", which suggests the team can proceed with structured review and proposal planning at this stage.`;
}

function buildScopeSignals(files, workstream) {
  const extensions = [...new Set(files.map(file => (file.name.split('.').pop() || 'file').toUpperCase()))];

  return [
    {
      title: 'Primary workstream',
      text: `The material points to a likely workstream of ${workstream}.`
    },
    {
      title: 'Document mix',
      text: `The uploaded package contains ${extensions.join(', ')} material, which suggests a mix of input formats across the opportunity workflow.`
    },
    {
      title: 'Review approach',
      text: 'The submission appears suitable for a first-pass intake, categorization, and response planning workflow.'
    }
  ];
}

function buildRiskFlags(files) {
  const flags = [];

  if (files.length < 2) {
    flags.push({
      title: 'Limited source coverage',
      text: 'Only a small amount of source material is available, which may reduce confidence in scope interpretation.'
    });
  }

  const hasSpreadsheet = files.some(file => (file.name || '').toLowerCase().endsWith('.xlsx') || (file.name || '').toLowerCase().endsWith('.xls'));
  if (!hasSpreadsheet) {
    flags.push({
      title: 'Commercial detail not obvious',
      text: 'No spreadsheet-based material was detected, so pricing, assumptions, or commercial structure may still need clarification.'
    });
  }

  flags.push({
    title: 'Metadata-only assessment',
    text: 'This prototype evaluates file names, types, and counts rather than full document content.'
  });

  return flags;
}

function buildRecommendedActions(files, readiness) {
  return [
    {
      title: 'Prepare structured review',
      text: 'Assign a first-pass reviewer to confirm scope, assumptions, and missing source material.'
    },
    {
      title: 'Draft response outline',
      text: `Use the current readiness level "${readiness}" to decide whether to move directly into outline creation or request additional inputs first.`
    },
    {
      title: 'Customer-facing packaging',
      text: files.length >= 2
        ? 'Prepare the next step toward proposal page generation and internal review packaging.'
        : 'Collect more source material before producing a customer-facing proposal page.'
    }
  ];
}

function buildFeed(files, workstream, readiness) {
  return [
    {
      title: 'Content grouped',
      text: `The uploaded files were grouped into a provisional workstream: ${workstream}.`
    },
    {
      title: 'Readiness assessed',
      text: `Current proposal readiness: ${readiness}.`
    },
    {
      title: 'Next-step recommendation',
      text: files.length >= 2
        ? 'Proceed to structured draft planning, scope review, and proposal page preparation.'
        : 'Request additional supporting material before moving to a fuller proposal response.'
    }
  ];
}

app.http('analyze', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'analyze',
  handler: async (request, context) => {
    context.log('Analyze API was called');

    try {
      const body = await request.json();
      const files = Array.isArray(body?.files) ? body.files : [];

      if (!files.length) {
        return {
          status: 400,
          jsonBody: {
            ok: false,
            message: 'No files were provided for analysis.'
          }
        };
      }

      const workstream = detectWorkstream(files);
      const readiness = buildReadiness(files);

      return {
        jsonBody: {
          ok: true,
          summary: {
            documentCount: files.length,
            workstream,
            readiness
          },
          executiveSummary: buildExecutiveSummary(files, workstream, readiness),
          scopeSignals: buildScopeSignals(files, workstream),
          riskFlags: buildRiskFlags(files),
          recommendedActions: buildRecommendedActions(files, readiness),
          feed: buildFeed(files, workstream, readiness),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      context.log(`Analyze API error: ${error.message}`);

      return {
        status: 500,
        jsonBody: {
          ok: false,
          message: 'The analysis request could not be processed.'
        }
      };
    }
  }
});
