import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import type { SessionPayload } from '../../auth/session.types';
import {
  GetApiInvoicesIdDownloadResponseDto,
  PostApiInvoicesRequestDto,
  PostApiInvoicesResponseDto,
} from './invoice-generation.dto';

@Injectable()
export class InvoiceGenerationService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Invoice', 'Order']);
  }

  async createInvoice(dto: PostApiInvoicesRequestDto): Promise<PostApiInvoicesResponseDto> {
    const order = await this.model('Order').findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (String(order.status).toLowerCase() !== 'confirmed') {
      throw new BadRequestException('order is not confirmed');
    }
    const existing = await this.model('Invoice').findUnique({ where: { orderId: dto.orderId } });
    if (existing) throw new ConflictException('invoice already exists for this order');
    const invoice = await this.model('Invoice').create({
      data: { orderId: dto.orderId, amount: dto.amount },
    });
    return { id: invoice.id, orderId: invoice.orderId, amount: invoice.amount };
  }

  async getDownload(session: SessionPayload, id: string): Promise<GetApiInvoicesIdDownloadResponseDto> {
    const invoice = await this.model('Invoice').findUnique({
      where: { id },
      include: { order: { include: { customer: true } } },
    });
    if (!invoice) throw new NotFoundException('invoice not found');
    if (session.role === 'CUSTOMER' && invoice.order?.customer?.userId !== session.userId) {
      throw new ForbiddenException('not your invoice');
    }
    return { id: invoice.id, downloadUrl: `/api/invoices/${invoice.id}/file` };
  }
}
