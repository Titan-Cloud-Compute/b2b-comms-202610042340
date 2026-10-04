import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvoiceGenerationService } from './invoice-generation.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { SessionPayload } from '../../auth/session.types';

function makePrisma() {
  return {
    order: { findUnique: jest.fn() },
    invoice: { findUnique: jest.fn(), create: jest.fn() },
  };
}

describe('InvoiceGenerationService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: InvoiceGenerationService;
  const customer: SessionPayload = { userId: 'u-cust', role: 'CUSTOMER', firmId: null };

  beforeEach(() => {
    prisma = makePrisma();
    service = new InvoiceGenerationService(prisma as unknown as PrismaService);
  });

  it('creates an invoice for a confirmed order', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'confirmed' });
    prisma.invoice.findUnique.mockResolvedValue(null);
    prisma.invoice.create.mockResolvedValue({ id: 'i1', orderId: 'o1', amount: 99.5 });
    await expect(service.createInvoice({ orderId: 'o1', amount: 99.5 })).resolves.toEqual({
      id: 'i1',
      orderId: 'o1',
      amount: 99.5,
    });
  });

  it('rejects missing, unconfirmed or already-invoiced orders', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(null);
    await expect(service.createInvoice({ orderId: 'x', amount: 1 })).rejects.toBeInstanceOf(NotFoundException);
    prisma.order.findUnique.mockResolvedValueOnce({ id: 'o1', status: 'pending' });
    await expect(service.createInvoice({ orderId: 'o1', amount: 1 })).rejects.toBeInstanceOf(BadRequestException);
    prisma.order.findUnique.mockResolvedValueOnce({ id: 'o1', status: 'CONFIRMED' });
    prisma.invoice.findUnique.mockResolvedValueOnce({ id: 'i0' });
    await expect(service.createInvoice({ orderId: 'o1', amount: 1 })).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a downloadUrl to the order customer', async () => {
    prisma.invoice.findUnique.mockResolvedValue({ id: 'i1', order: { customer: { userId: 'u-cust' } } });
    const res = await service.getDownload(customer, 'i1');
    expect(res.id).toBe('i1');
    expect(res.downloadUrl).toContain('i1');
  });

  it('forbids other customers and 404s unknown invoices', async () => {
    prisma.invoice.findUnique.mockResolvedValueOnce({ id: 'i1', order: { customer: { userId: 'other' } } });
    await expect(service.getDownload(customer, 'i1')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.invoice.findUnique.mockResolvedValueOnce(null);
    await expect(service.getDownload(customer, 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
