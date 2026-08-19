import { Injectable } from '@nestjs/common';

@Injectable()
export class FirmwareDiagnosticsHandlerV16 {
  async handle(message: any[]): Promise<any[]> {
    const uuid = message[1];
    return [3, uuid, {}];
  }
}
