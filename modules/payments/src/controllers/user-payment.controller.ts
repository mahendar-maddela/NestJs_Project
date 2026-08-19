import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserAuthGuard } from '@modules/auth';
import { UserPaymentService } from '../services/user-payment.service';
import { CreateRazorpayOrderDto } from '../dto/create-razorpay-order.dto';

function currentClientId(req: any): number {
  return Number(req.client?.clientId || req.user?.clientId || req.headers['x-client-id'] || 1);
}

/** Mirrors `routes/app/paymentTransactionRoutes.js`, mounted at `v1/payment` and reused at `v1/web/payment` by the web router. */
@Controller(['v1/payment', 'v1/web/payment'])
@UseGuards(UserAuthGuard)
export class UserPaymentController {
  constructor(private readonly paymentService: UserPaymentService) {}

  @Get()
  async getAllPayments(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.paymentService.getAllPayments(req.user.id, currentClientId(req), Number(page) || 1, Number(limit) || 200);
  }

  @Post()
  async createRazorpayOrder(@Req() req: any, @Body() dto: CreateRazorpayOrderDto) {
    return this.paymentService.createRazorpayOrder(req.user.id, currentClientId(req), dto.amount, dto.couponId);
  }
}
