import { Controller, Get, Post, Put, Body, Param, Query, ParseIntPipe, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { SuperAdminClientsService } from '../services/super-admin-clients.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { ClientQueryDto } from '../dto/client-query.dto';
import { SuperAdminAuthGuard } from '@modules/auth';

@Controller('v1/super-admin/client')
@UseGuards(SuperAdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: false }))
export class SuperAdminClientsController {
  constructor(private readonly superAdminClientsService: SuperAdminClientsService) {}

  /** Extracts the multipart document files legacy accepted for a client (see legacy
   *  `routes/SuperAdmin/clientRoutes.js` `uploadfiles.fields([...])` — logo, agreement, nda,
   *  kyc_documents, gst_certificate, cancelled_cheque, business_license, pushNotification).
   *  Returns a map of field name → file part, empty when none were sent. */
  private extractClientDocuments(req: any): Record<string, any> {
    const keys = [
      'agreement',
      'nda',
      'kyc_documents',
      'gst_certificate',
      'cancelled_cheque',
      'business_license',
      'pushNotification',
      'logo',
    ];
    const files: Record<string, any> = {};

    const pick = (key: string): any => {
      if (req.files && req.files[key]) {
        const val = req.files[key];
        return Array.isArray(val) ? val[0] : val;
      }
      const bodyVal = req.body && req.body[key];
      if (bodyVal && typeof bodyVal === 'object' && !Array.isArray(bodyVal)) {
        // fastify-multipart `addToBody: true` puts file parts straight into req.body
        if (bodyVal.type === 'file' || bodyVal._buf || typeof bodyVal.toBuffer === 'function' || bodyVal.filename) {
          return bodyVal;
        }
      }
      if (bodyVal && Array.isArray(bodyVal)) {
        const first = bodyVal[0];
        if (first && (first.type === 'file' || first._buf || typeof first.toBuffer === 'function' || first.filename)) {
          return first;
        }
      }
      return undefined;
    };

    for (const key of keys) {
      const file = pick(key);
      if (file) files[key] = file;
    }
    return files;
  }

  @Get('features')
  async getClientFeatures() {
    return this.superAdminClientsService.getClientFeatures();
  }

  @Get()
  async getAllClients(@Query() query: ClientQueryDto) {
    return this.superAdminClientsService.getAllClients(query);
  }

  @Get(':id')
  async getClientById(@Param('id', ParseIntPipe) id: number) {
    return this.superAdminClientsService.getClientById(id);
  }

  @Post()
  async createClient(@Req() req: any, @Body() body: CreateClientDto) {
    return this.superAdminClientsService.createClient(body, this.extractClientDocuments(req));
  }

  @Put(':id')
  async updateClient(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateClientDto) {
    return this.superAdminClientsService.updateClient(id, body, this.extractClientDocuments(req));
  }

  @Post('test-email')
  async testEmailTemplate(@Body() body: any) {
    return this.superAdminClientsService.testEmailTemplate(body);
  }
}
