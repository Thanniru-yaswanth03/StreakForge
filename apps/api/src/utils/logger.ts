export interface LogMetadata {
  [key: string]: unknown;
}

export const logger = {
  info: (message: string, meta?: LogMetadata) => {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...meta
      })
    );
  },
  warn: (message: string, meta?: LogMetadata) => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...meta
      })
    );
  },
  error: (message: string, meta?: LogMetadata) => {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        ...meta
      })
    );
  },
  debug: (message: string, meta?: LogMetadata) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        JSON.stringify({
          level: 'debug',
          timestamp: new Date().toISOString(),
          message,
          ...meta
        })
      );
    }
  }
};

