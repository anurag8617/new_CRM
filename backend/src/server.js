import app from './app.js';
import { config } from './config/env.js';
import { checkDbConnection } from './config/db.js';

const startServer = async () => {
  try {
    console.log('[Server] Initializing CRM Backend...');
    
    // Check Database connection on start
    await checkDbConnection();

    app.listen(config.port, () => {
      console.log(`[Server] CRM Backend API running in ${config.nodeEnv} mode at http://localhost:${config.port}`);
      console.log(`[Server] Health Check available at http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    console.error('[Server Error] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
