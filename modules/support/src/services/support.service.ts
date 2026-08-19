import { Injectable } from '@nestjs/common';
import { SupportRepository } from '../repositories/support.repository';

@Injectable()
export class SupportService {
  constructor(private readonly supportRepository: SupportRepository) {}

  async getAllTickets() {
    return this.supportRepository.findAllTickets();
  }
}
