// Vercel serverless wrapper for the Express app
// This imports the compiled app (without the listen() call) and exports a handler

import app from '../dist/server/vercel-app.js';

export default app;