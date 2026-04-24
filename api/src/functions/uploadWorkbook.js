const { app } = require('@azure/functions');
const { parseWorkbook } = require('../lib/excel/parseWorkbook');

function removeDataUrlPrefix(base64Value) {
  if (!base64Value || typeof base64Value !== 'string') {
    return '';
  }

  const trimmedValue = base64Value.trim();
  const commaIndex = trimmedValue.indexOf(',');

  if (trimmedValue.startsWith('data:') && commaIndex !== -1) {
    return trimmedValue.slice(commaIndex + 1).trim();
  }

  return trimmedValue;
}

function isLikelyBase64(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const normalized = value.replace(/\s+/g, '');
  return normalized.length > 0 && normalized.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(normalized);
}

app.http('uploadWorkbook', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'uploadWorkbook',
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

      const fileName = String(body?.fileName || '').trim();
      const fileContentBase64 = removeDataUrlPrefix(body?.fileContentBase64);

      if (!fileName) {
        return {
          status: 400,
          jsonBody: {
            ok: false,
            message: 'fileName is required.'
          }
        };
      }

      if (!fileContentBase64) {
        return {
          status: 400,
          jsonBody: {
            ok: false,
            message: 'fileContentBase64 is required.'
          }
        };
      }

      if (!isLikelyBase64(fileContentBase64)) {
        return {
          status: 400,
          jsonBody: {
            ok: false,
            message: 'fileContentBase64 must be a valid base64 string.'
          }
        };
      }

      const buffer = Buffer.from(fileContentBase64, 'base64');

      if (!buffer.length) {
        return {
          status: 400,
          jsonBody: {
            ok: false,
            message: 'Decoded file content is empty.'
          }
        };
      }

      const workbook = parseWorkbook(buffer);

      return {
        status: 200,
        jsonBody: {
          ok: true,
          fileName,
          workbook
        }
      };
    } catch (error) {
      context.log('uploadWorkbook failed', error);

      return {
        status: 500,
        jsonBody: {
          ok: false,
          message: 'Failed to parse workbook.',
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
});
