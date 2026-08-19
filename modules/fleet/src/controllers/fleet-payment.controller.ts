import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FleetAuthGuard } from '@modules/auth';
import { FleetPaymentService } from '../services/fleet-payment.service';
import { CreateFleetRazorpayOrderDto } from '../../../payments/src/dto/create-razorpay-order.dto';

/** Mirrors `routes/Fleet/paymentTransactionRoutes.js`. */
@Controller('v1/fleet/payment')
@UseGuards(FleetAuthGuard)
export class FleetPaymentController {
  constructor(private readonly paymentService: FleetPaymentService) {}

  @Get()
  async getAllPaymentTransactions(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.paymentService.getAllPaymentTransactions(Number(req.user.fleetId), Number(req.user.clientId), Number(page) || 1, Number(limit) || 200);
  }

  @Post()
  async createFleetRazorpayOrder(@Req() req: any, @Body() dto: CreateFleetRazorpayOrderDto) {
    return this.paymentService.createFleetRazorpayOrder(Number(req.user.fleetId), Number(req.user.clientId), dto.amount, dto.couponId);
  }
}
