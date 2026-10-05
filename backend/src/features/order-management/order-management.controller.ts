import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import type { SessionPayload } from '../../auth/session.types';
import { CreateOrderInput, OrderManagementService } from './order-management.service';

function sessionOf(req: Request): SessionPayload {
  if (!req.session) throw new UnauthorizedException('not authenticated');
  return req.session;
}

@ApiTags('order-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/orders')
export class OrderManagementController {
  constructor(private readonly ordermanagement: OrderManagementService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.CUSTOMER)
  async create(@Req() req: Request, @Body() body: CreateOrderInput) {
    return this.ordermanagement.createOrder(sessionOf(req), body);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async confirm(@Req() req: Request, @Param('id') id: string, @Body() body: { estimatedDelivery?: unknown }) {
    return this.ordermanagement.confirmOrder(sessionOf(req), id, body?.estimatedDelivery);
  }

  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.ADMIN)
  async list(@Req() req: Request) {
    return this.ordermanagement.listOrders(sessionOf(req));
  }
}
