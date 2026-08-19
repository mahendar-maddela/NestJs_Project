import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OcpiCpo } from '../../../ocpi/src/entities/ocpi-cpo.entity';
import { OcpiEmsp } from '../../../ocpi/src/entities/ocpi-emsp.entity';
import { FastifyRequest } from 'fastify';

function unauthorizedOcpiResponse() {
  return {
    data: null,
    status_code: 2001,
    status_message: 'Unauthorized',
    timestamp: new Date().toISOString(),
  };
}

/**
 * OCPI tokens travel as base64("Scheme <base64(rawToken)>") to mirror the
 * legacy `ocpiAuthorization.js` middleware exactly (it does
 * `authorization.split(" ")[1]` then base64-decodes, regardless of scheme word).
 */
function decodeOcpiToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const raw = authHeader.split(' ')[1];
  if (!raw) return null;
  try {
    return Buffer.from(raw, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Guards the "we are CPO" side: `/v1/ocpi/emsp/*` is called by an external CPO,
 * authenticated with Token A that we issued to them (`OcpiCpo.token_a`).
 */
@Injectable()
export class OcpiCpoAuthGuard implements CanActivate {
  constructor(@InjectRepository(OcpiCpo) private readonly ocpiCpoRepo: Repository<OcpiCpo>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const token = decodeOcpiToken(req.headers['authorization']);

    if (!token) {
      throw new UnauthorizedException(unauthorizedOcpiResponse());
    }

    const ocpiCpo = await this.ocpiCpoRepo.findOne({ where: { token_a: token } });

    if (!ocpiCpo) {
      throw new UnauthorizedException(unauthorizedOcpiResponse());
    }

    (req as any).cpo = ocpiCpo;
    (req as any).clientId = ocpiCpo.clientId;
    return true;
  }
}

/**
 * Guards the "we are eMSP" side: `/v1/ocpi/cpo/*` is called by an external eMSP,
 * authenticated with Token A that we issued to them (`OcpiEmsp.token_a`).
 */
@Injectable()
export class OcpiEmspAuthGuard implements CanActivate {
  constructor(@InjectRepository(OcpiEmsp) private readonly ocpiEmspRepo: Repository<OcpiEmsp>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const token = decodeOcpiToken(req.headers['authorization']);

    if (!token) {
      throw new UnauthorizedException(unauthorizedOcpiResponse());
    }

    const ocpiEmsp = await this.ocpiEmspRepo.findOne({ where: { token_a: token } });

    if (!ocpiEmsp) {
      throw new UnauthorizedException(unauthorizedOcpiResponse());
    }

    (req as any).emsp = ocpiEmsp;
    (req as any).clientId = ocpiEmsp.clientId;
    return true;
  }
}
