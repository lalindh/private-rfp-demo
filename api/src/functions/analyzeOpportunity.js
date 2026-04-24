const { app } = require('@azure/functions');
const { normalizeDocuments } = require('../lib/documents/normalizeDocuments');
const { runAnalysisAgent } = require('../lib/agents/analysisAgent');

app.http('analyzeOpportunity', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'analyzeOpportunity',
  handler: async (request, context) => {
    try {
      let body;

      try {
        body = await request.json();
      } catch (error) {
        return {
          status: 400,
          jsonBody: {
            ok: false,
            message: 'Request body must be valid JSON.'
          }
        };
      }

      const files = Array.isArray(body?.files) ? body.files : [];
      const workbook = body?.workbook && typeof body.workbook === 'object' ? body.workbook : null;

      if (!files.length) {
        return {
          status: 400,
          jsonBody: {
            ok: false,
            message: 'No files were provided.'
          }
        };
      }

      const documentPackage = normalizeDocuments(files, workbook);
      const analysis = await runAnalysisAgent(documentPackage);

      return {
        status: 200,
        jsonBody: {
          ok: true,
          timestamp: new Date().toISOString(),
          documentPackage,
          analysis
        }
      };
    } catch (error) {
      context.log('analyzeOpportunity failed', error);

      return {
        status: 500,
        jsonBody: {
          ok: false,
          message: 'Failed to analyze opportunity.',
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
});
