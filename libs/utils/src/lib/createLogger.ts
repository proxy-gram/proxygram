import * as winston from 'winston';
import * as process from 'node:process';

export function createLogger(label: string) {
  return winston.createLogger({
    level: process.env['PROXYGRAM_LOG_LEVEL'] || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.label({
        label,
      }),
      winston.format.colorize(),
      winston.format.splat(),
      winston.format.printf(
        (info) => `${info['timestamp']} ${info.level}: ${info.message}`
      )
    ),
    transports: [new winston.transports.Console({})],
  });
}
