import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderManagementController } from './order-management.controller';
import { OrderManagementService } from './order-management.service';

/** Test auth: `x-test-role` / `x-test-user` headers populate req.session. */
class FakeJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const role = req.headers['x-test-role'];
    if (role) req.session = { userId: req.headers['x-test-user'] ?? 'u1', role, firmId: null };
    return true;
  }
}

function makePrisma() {
  const orders: any[] = [];
  let seq = 0;
  return {
    orders,
    customer: {
      findUnique: jest.fn(async ({ where }: any) =>
        where.userId === 'cust-user' ? { id: 'cust-1', userId: 'cust-user', email: 'c@x' } : null,
      ),
    },
    vendorProfile: {
      findUnique: jest.fn(async ({ where }: any) =>
        where.userId === 'vend-user' ? { id: 'vend-1', userId: 'vend-user' } : null,
      ),
    },
    order: {
      create: jest.fn(async ({ data }: any) => {
        const o = {
          id: `order-${++seq}`,
          status: data.status,
          customerId: data.customerId,
          vendorId: data.vendorId,
          orderItems: (data.orderItems?.create ?? []).map((i: any, n: number) => ({ id: `item-${n}`, ...i })),
        };
        orders.push(o);
        return o;
      }),
      findMany: jest.fn(async ({ where }: any = {}) =>
        orders.filter((o) => !where || Object.entries(where).every(([k, v]) => o[k] === v)),
      ),
      findUnique: jest.fn(async ({ where }: any) => orders.find((o) => o.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        const o = orders.find((x) => x.id === where.id);
        Object.assign(o, data);
        return o;
      }),
    },
  };
}

describe('OrderManagementController (supertest)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const mod = await Test.createTestingModule({
      controllers: [OrderManagementController],
      providers: [OrderManagementService, Reflector, { provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtGuard)
      .overrideGuard(RolesGuard)
      .useFactory({ factory: (r: Reflector) => new RolesGuard(r), inject: [Reflector] })
      .compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const customer = { 'x-test-role': 'CUSTOMER', 'x-test-user': 'cust-user' };
  const vendor = { 'x-test-role': 'VENDOR', 'x-test-user': 'vend-user' };

  it('customer creates a pending order (201 with the Order record)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set(customer)
      .send({ vendorId: 'vend-1', items: [{ description: 'Widget', quantity: 2, unitPrice: 9.5 }] })
      .expect(201);
    expect(res.body).toMatchObject({ status: 'pending', customerId: 'cust-1', vendorId: 'vend-1' });
    expect(res.body.id).toBeDefined();
  });

  it('rejects order creation without vendorId', async () => {
    await request(app.getHttpServer()).post('/api/orders').set(customer).send({}).expect(400);
  });

  it('forbids vendors from creating orders', async () => {
    await request(app.getHttpServer()).post('/api/orders').set(vendor).send({ vendorId: 'vend-1' }).expect(403);
  });

  it('vendor confirms a pending order and the customer sees it as confirmed', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/orders')
      .set(customer)
      .send({ vendorId: 'vend-1' })
      .expect(201);

    const queue = await request(app.getHttpServer()).get('/api/orders').set(vendor).expect(200);
    expect(queue.body.map((o: any) => o.id)).toContain(created.body.id);

    const res = await request(app.getHttpServer())
      .patch(`/api/orders/${created.body.id}/confirm`)
      .set(vendor)
      .send({ estimatedDelivery: '2026-11-01' })
      .expect(200);
    expect(res.body).toMatchObject({ id: created.body.id, status: 'confirmed' });

    const mine = await request(app.getHttpServer()).get('/api/orders').set(customer).expect(200);
    expect(mine.body[0]).toMatchObject({ id: created.body.id, status: 'confirmed' });
  });

  it('rejects confirm without a valid estimatedDelivery', async () => {
    const created = await request(app.getHttpServer()).post('/api/orders').set(customer).send({ vendorId: 'vend-1' });
    await request(app.getHttpServer())
      .patch(`/api/orders/${created.body.id}/confirm`)
      .set(vendor)
      .send({ estimatedDelivery: 'nope' })
      .expect(400);
  });

  it('forbids customers from confirming orders', async () => {
    await request(app.getHttpServer())
      .patch('/api/orders/x/confirm')
      .set(customer)
      .send({ estimatedDelivery: '2026-11-01' })
      .expect(403);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/orders').expect(401);
  });
});
