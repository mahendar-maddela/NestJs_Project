import { Controller, Get, Query, Req } from '@nestjs/common';
import { AdminClientsService } from '../services/admin-clients.service';

/** `client/info` mirrors `controllers/admin/clientController.js:clientInfoWithOutAuth`, reused unauthenticated across admin/fleet/vendor/web/app route trees in legacy. */
@Controller(['v1/admin', 'v1/fleet', 'v1/vendor', 'v1/web', 'v1'])
export class AdminClientsController {
  constructor(private readonly adminClientsService: AdminClientsService) {}

  @Get('client/info')
  async getClientInfo(
    @Req() req: any,
    @Query('details') details?: any,
    @Query('logo') logo?: any,
    @Query('login') login?: any,
  ) {
    const clientId = Number(
      req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || req.query?.clientId || 1,
    );
    return this.adminClientsService.getClientInfo(clientId, { details, logo, login });
  }
}
