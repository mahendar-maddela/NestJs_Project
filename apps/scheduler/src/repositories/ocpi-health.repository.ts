import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { OcpiCpo } from 'modules/ocpi/src/entities/ocpi-cpo.entity';
import { OcpiCpoVersion } from 'modules/ocpi/src/entities/ocpi-cpo-version.entity';
import { OcpiCpoVersionEndpoint } from 'modules/ocpi/src/entities/ocpi-cpo-version-endpoint.entity';
import { OCPI_IDENTIFIERS, OCPI_ROLES } from 'modules/ocpi/src/constants/ocpi.constants';

@Injectable()
export class OcpiHealthRepository {
  constructor(
    @InjectRepository(OcpiCpo) private readonly ocpiCpoRepo: Repository<OcpiCpo>,
    @InjectRepository(OcpiCpoVersion) private readonly versionRepo: Repository<OcpiCpoVersion>,
    @InjectRepository(OcpiCpoVersionEndpoint) private readonly endpointRepo: Repository<OcpiCpoVersionEndpoint>,
  ) {}

  /** Mirrors `sessionHandler.js:requestSessions`'s `OcpiCpo.findAll({where:{status:{notIn:[...]}}})`. */
  findCposToCheck() {
    return this.ocpiCpoRepo.find({
      where: { status: Not(In(['PLANNED', 'SUSPENDED'])) as any },
      select: { id: true, status: true, token_b: true },
    });
  }

  findVersion(cpoId: number, version: string) {
    return this.versionRepo.findOne({ where: { cpoId, version }, select: { id: true } });
  }

  findLocationsSenderEndpoint(versionId: number) {
    return this.endpointRepo.findOne({
      where: { versionId, identifier: OCPI_IDENTIFIERS.locations, role: OCPI_ROLES.sender },
    });
  }

  async updateCpoStatus(id: number, status: string): Promise<void> {
    await this.ocpiCpoRepo.update(id, { status: status as any });
  }
}
