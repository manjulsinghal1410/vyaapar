import { randomUUID } from 'crypto';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  traceId: string;
  [key: string]: any;
}

class Logger {
  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId: randomUUID(),
      ...data,
    };
  }

  private log(entry: LogEntry): void {
    console.log(JSON.stringify(entry));
  }

  debug(message: string, data?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'production') return;
    this.log(this.createLogEntry('DEBUG', message, data));
  }

  info(message: string, data?: Record<string, any>): void {
    this.log(this.createLogEntry('INFO', message, data));
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log(this.createLogEntry('WARN', message, data));
  }

  error(message: string, error?: Error, data?: Record<string, any>): void {
    const errorData = error
      ? {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        }
      : {};

    this.log(this.createLogEntry('ERROR', message, { ...errorData, ...data }));
  }

  metric(name: string, data?: Record<string, any>): void {
    const metricData = {
      metric: name,
      count: 1,
      ...data,
    };
    this.info(`Metric: ${name}`, metricData);
  }
}

export const logger = new Logger();