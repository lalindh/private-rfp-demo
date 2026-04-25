module.exports = async function (context, req) {
  context.log('Message API was called');

  return {
    status: 200,
    body: {
      ok: true,
      message: 'Hello from classic Azure Functions',
      timestamp: new Date().toISOString()
    }
  };
};
