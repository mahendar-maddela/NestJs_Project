import { Injectable } from '@nestjs/common';

@Injectable()
export class ZohoService {
  async syncCustomer(data: any) {
    return { success: true };
  }
}
