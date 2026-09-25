import pino from 'pino';
import type { Logger, LoggerConfiguration, LogFields } from './definition';

// ✅ Best Practice: wrap pino behind our own Logger interface so the
// underlying logging library can be swapped without touching call sites.
class PinoLoggerWrapper implements Logger {
  #pinoInstance: pino.Logger;

  constructor(pinoInstance: pino.Logger) {
    this.#pinoInstance = pinoInstance;
  }

  debug(message: string, fields?: LogFields): void {
    this.#pinoInstance.debug(fields ?? {}, message);
  }

  info(message: string, fields?: LogFields): void {
    this.#pinoInstance.info(fields ?? {}, message);
  }

  warn(message: string, fields?: LogFields): void {
    this.#pinoInstance.warn(fields ?? {}, message);
  }

  error(message: string, fields?: LogFields): void {
    this.#pinoInstance.error(fields ?? {}, message);
  }

  child(bindings: LogFields): Logger {
    return new PinoLoggerWrapper(this.#pinoInstance.child(bindings));
  }
}

export function createLogger(config: LoggerConfiguration): Logger {
  const pinoInstance = pino({
    level: config.level,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: { service: config.serviceName },
    transport: config.prettyPrint
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  });
  return new PinoLoggerWrapper(pinoInstance);
}
