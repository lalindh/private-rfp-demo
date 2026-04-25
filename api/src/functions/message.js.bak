const { app } = require('@azure/functions');

app.http('message', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'message',
  handler: async (request, context) => {
    context.log('Message API was called');

    return {
      jsonBody: {
        ok: true,
        message: 'Hello from Azure Functions',
        timestamp: new Date().toISOString()
      }
    };
  }
});
