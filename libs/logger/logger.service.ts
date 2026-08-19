import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CustomLoggerService extends Logger {
  log(message: string, context?: string) {
    super.log(message, context || 'EnterpriseApp');
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context || 'EnterpriseApp');
  }

  warn(message: string, context?: string) {
    super.warn(message, context || 'EnterpriseApp');
  }

  debug(message: string, context?: string) {
    super.debug(message, context || 'EnterpriseApp');
  }
}
