import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AdminConnectorRepository } from '../repositories/admin-connector.repository';
import { CreateConnectorDto, UpdateConnectorDto } from '../dto/admin-connector.dto';

/** Mirrors `controllers/admin/connectorController.js`. */
@Injectable()
export class AdminConnectorService {
  constructor(private readonly repo: AdminConnectorRepository) {}

  async createConnector(dto: CreateConnectorDto) {
    try {
      const connector = await this.repo.create(dto);
      return { success: true, message: 'Connector created successfully', data: connector };
    } catch {
      throw new InternalServerErrorException({ success: false, message: 'Server error' });
    }
  }

  async getAllConnectors() {
    const connectors = await this.repo.findAll();
    return { success: true, message: 'Connectors fetched successfully', data: connectors };
  }

  async getConnectorById(id: number) {
    const connector = await this.repo.findById(id);
    if (!connector) {
      throw new NotFoundException({ message: 'Connector not found' });
    }
    return { success: true, message: 'Connector fetched successfully', data: connector };
  }

  async updateConnector(id: number, dto: UpdateConnectorDto) {
    const connector = await this.repo.findById(id);
    if (!connector) {
      throw new NotFoundException({ message: 'Connector not found' });
    }
    const updated = await this.repo.update(id, dto);
    return { success: true, message: 'Connector updated successfully', data: updated };
  }

  async deleteConnector(id: number) {
    const connector = await this.repo.findById(id);
    if (!connector) {
      throw new NotFoundException({ message: 'Connector not found' });
    }
    await this.repo.delete(id);
    return { success: true, message: 'Connector deleted successfully' };
  }
}
