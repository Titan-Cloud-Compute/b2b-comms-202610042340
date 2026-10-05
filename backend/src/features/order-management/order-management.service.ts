import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import type { SessionPayload } from '../../auth/session.types';

export interface OrderItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  vendorId: string;
  items?: OrderItemInput[];
}

@Injectable()
export class OrderManagementService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Order', 'OrderItem'] as const);
  }

  async createOrder(session: SessionPayload, input: CreateOrderInput) {
    if (!input || typeof input.vendorId !== 'string' || !input.vendorId.trim()) {
      throw new BadRequestException('vendorId is required');
    }
    const items = Array.isArray(input.items) ? input.items : [];
    for (const it of items) {
      if (
        !it ||
        typeof it.description !== 'string' ||
        !it.description.trim() ||
        !Number.isInteger(it.quantity) ||
        it.quantity < 1 ||
        typeof it.unitPrice !== 'number' ||
        !(it.unitPrice >= 0)
      ) {
        throw new BadRequestException('each item needs description, quantity >= 1 and unitPrice >= 0');
      }
    }
    const customer = await this.prisma.customer.findUnique({ where: { userId: session.userId } });
    if (!customer) throw new ForbiddenException('no customer record for this user');

    const order = await this.model('Order').create({
      data: {
        status: 'pending',
        customerId: customer.id,
        vendorId: input.vendorId,
        orderItems: {
          create: items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        },
      },
      include: { orderItems: true },
    });
    return order;
  }

  async listOrders(session: SessionPayload) {
    if (session.role === 'ADMIN') {
      return this.model('Order').findMany({ include: { orderItems: true }, orderBy: { createdAt: 'desc' } });
    }
    if (session.role === 'VENDOR') {
      const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId: session.userId } });
      if (!vendor) return [];
      return this.model('Order').findMany({
        where: { vendorId: vendor.id },
        include: { orderItems: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    const customer = await this.prisma.customer.findUnique({ where: { userId: session.userId } });
    if (!customer) return [];
    return this.model('Order').findMany({
      where: { customerId: customer.id },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirmOrder(session: SessionPayload, id: string, estimatedDelivery: unknown) {
    if (typeof estimatedDelivery !== 'string' || Number.isNaN(Date.parse(estimatedDelivery))) {
      throw new BadRequestException('estimatedDelivery must be a valid date');
    }
    const order = await this.model('Order').findUnique({ where: { id } });
    if (!order) throw new NotFoundException('order not found');
    if (session.role !== 'ADMIN') {
      const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId: session.userId } });
      if (!vendor || vendor.id !== order.vendorId) {
        throw new ForbiddenException('order belongs to another vendor');
      }
    }
    if (order.status !== 'pending') {
      throw new BadRequestException(`order is ${order.status}, only pending orders can be confirmed`);
    }
    const updated = await this.model('Order').update({ where: { id }, data: { status: 'confirmed' } });
    return { id: updated.id, status: updated.status, estimatedDelivery };
  }
}
