import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

describe('AuditLogController (supertest)', () => {
  let app: INestApplication;
  const rows = [
    { id: 'a', action: 'login', userId: '11111111-1111-4111-8111-111111111111', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', action: 'logout', userId: '11111111-1111-4111-8111-111111111111', createdAt: '2026-01-02T00:00:00.000Z' },
  ];
  const service = {
    list: jest.fn().mockResolvedValue(rows),
    create: jest.fn().mockImplementation(async (d: { action: string; userId: string }) => ({
      id: 'c', ...d, createdAt: '2026-01-03T00:00:00.000Z',
    })),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/admin/audit-log returns 200 with entries in chronological order', async () => {
    const res = await request(app.getHttpServer()).get('/api/admin/audit-log').expect(200);
    expect(res.body.map((r: { id: string }) => r.id)).toEqual(['a', 'b']);
  });

  it('POST /api/admin/audit-log returns 201 with the created record', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/audit-log')
      .send({ action: 'order.create', userId: '11111111-1111-4111-8111-111111111111' })
      .expect(201);
    expect(res.body).toMatchObject({ id: 'c', action: 'order.create' });
    expect(res.body.createdAt).toBeDefined();
  });

  it('POST /api/admin/audit-log rejects an invalid userId with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/audit-log')
      .send({ action: 'x', userId: 'not-a-uuid' })
      .expect(400);
  });
});
