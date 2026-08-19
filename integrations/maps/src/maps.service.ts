import { Injectable } from '@nestjs/common';

@Injectable()
export class MapsService {
  async geocode(address: string) {
    return { lat: 0, lng: 0, address };
  }
}
