const { app } = require('@azure/functions');
const { parseWorkbook } = require('../lib/excel/parseWorkbook');

function removeDataUrlPrefix(base64Value) {
  if (!base64Value || typeof base64Value !== 'string') {
    return '';
  }

  const commaIndex = base64Value.indexOf(',');
  if (base64Value.startsWith('data:') && commaIndex !== -1) {
    return base64Value.slice(commaIndex + 1);
  }

  return base64Value;
}

app.http('uploadWorkbook', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'uploadWorkbook',
  handler: async (request, context) => {
    try {
      const body = await request.json();

      const fileName = String(body?.fileName || '').trim();
      const fileContentBase64 = removeDataUrlPrefix(body?.fileContentBase64);

      if (!fileName) {
        return Response.json(
          {
            ok: false,
            message: 'fileName is required.'
          },
          { status: 400 }
        );
      }

      if (!fileContentBase64) {
        return Response.json(
          {
            ok: false,
            message: 'fileContentBase64 is required.'
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(fileContentBase64, 'base64');
      const workbook = parseWorkbook(buffer);

      return Response.json(
        {
          ok: true,
          fileName,
          workbook
        },
        { status: 200 }
      );
    } catch (error) {
      context.log('uploadWorkbook failed', error);

      return Response.json(
        {
          ok: false,
          message: 'Failed to parse workbook.',
          error: error.message
        },
        { status: 500 }
      );
    }
  }
});
