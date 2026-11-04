import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { ENV } from './config/env.js';
import { SchedulerService } from './services/schedulerService.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    await connectDatabase();
    const app = createApp();

    // Start background scheduler and worker loops
    SchedulerService.start();

    const server = app.listen(ENV.PORT, () => {
      logger.info(`StreakForge API Server running on port ${ENV.PORT}`, {
        port: ENV.PORT,
        nodeEnv: ENV.NODE_ENV
      });
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      SchedulerService.stop();
      server.close(async () => {
        await disconnectDatabase();
        logger.info('API server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start StreakForge API server', { error });
    process.exit(1);
  }
}

bootstrap();

