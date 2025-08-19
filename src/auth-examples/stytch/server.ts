import createStytchApp from "./index.js";

/**
 * Environment configuration
 */
const env = {
  STYTCH_DOMAIN: process.env.STYTCH_DOMAIN || "https://test.stytch.com",
  STYTCH_PROJECT_ID:
    process.env.STYTCH_PROJECT_ID ||
    "project-test-00000000-0000-0000-0000-000000000000",
};

/**
 * Create and start the Express application
 */
function startServer() {
  const app = createStytchApp(env);
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`🚀 Stytch Express server running on port ${port}`);
    console.log(`📋 API endpoints:`);
    console.log(`   GET  /.well-known/oauth-protected-resource`);
    console.log(`   GET  /api/todos`);
    console.log(`   GET  /sse/* (protected)`);
    console.log(`   POST /mcp/* (protected)`);
    console.log(`💡 Protected routes require Bearer token authentication`);
  });
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { startServer };
