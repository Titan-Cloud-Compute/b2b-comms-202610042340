import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { InvoiceGenerationService } from './invoice-generation.service';
import { PostApiInvoicesRequestDto } from './invoice-generation.dto';

@ApiTags('invoice-generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/invoices')
export class InvoiceGenerationController {
  constructor(private readonly invoicegeneration: InvoiceGenerationService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.VENDOR)
  async postApiInvoices(@Body() dto: PostApiInvoicesRequestDto) {
    return this.invoicegeneration.createInvoice(dto);
  }

  @Get(':id/download')
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.ADMIN)
  async getApiInvoicesIdDownload(@Param('id') id: string, @Req() req: Request) {
    return this.invoicegeneration.getDownload(req.session!, id);
  }
}
