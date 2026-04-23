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
  if (files.length >= 3) {
    return 'Draft can be prepared';
  }

  if (files.length === 2) {
    return 'Good basis for draft';
  }

  return 'More source material recommended';
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
      title: 'Recommended next step',
      text: files.length >= 2
        ? 'Move to response drafting, scope review, and page generation for customer presentation.'
        : 'Upload more source material to improve scope detection and draft quality.'
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
      const feed = buildFeed(files, workstream, readiness);

      return {
        jsonBody: {
          ok: true,
          summary: {
            documentCount: files.length,
            workstream,
            readiness
          },
          feed,
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
