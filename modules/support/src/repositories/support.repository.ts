import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientSupport } from '../entities/client-support.entity';

@Injectable()
export class SupportRepository {
  constructor(
    @InjectRepository(ClientSupport)
    private readonly supportRepo: Repository<ClientSupport>,
  ) {}

  async findAllTickets() {
    return this.supportRepo.find();
  }
}
