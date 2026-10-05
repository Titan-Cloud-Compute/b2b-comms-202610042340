import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';

class FakeSessionGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.session = { userId: USER_ID, role: 'USER', firmId: null };
    return true;
  }
}

describe('NotificationPreferencesController (supertest)', () => {
  let app: INestApplication;
  const rows = new Map<string, { id: string; userId: string; orderAlerts: boolean; messageAlerts: boolean }>();
  const fakePrisma = {
    notificationPreference: {
      findUnique: jest.fn(async ({ where }: any) => rows.get(where.userId) ?? null),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = rows.get(where.userId);
        const row = existing ? { ...existing, ...update } : { id: 'np-1', ...create };
        rows.set(where.userId, row);
        return row;
      }),
    },
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [NotificationPreferencesController],
      providers: [NotificationPreferencesService, { provide: PrismaService, useValue: fakePrisma }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeSessionGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('PUT stores preferences and returns 200 with the stored record', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/notifications/preferences')
      .send({ orderAlerts: true, messageAlerts: false })
      .expect(200);
    expect(res.body).toEqual({ userId: USER_ID, orderAlerts: true, messageAlerts: false });
  });

  it('PUT with all alerts false stores both fields as false', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/notifications/preferences')
      .send({ orderAlerts: false, messageAlerts: false })
      .expect(200);
    expect(res.body).toEqual({ userId: USER_ID, orderAlerts: false, messageAlerts: false });
    expect(rows.get(USER_ID)).toMatchObject({ orderAlerts: false, messageAlerts: false });
  });

  it('GET returns the session user preferences', async () => {
    const res = await request(app.getHttpServer()).get('/api/notifications/preferences').expect(200);
    expect(res.body).toEqual({ userId: USER_ID, orderAlerts: false, messageAlerts: false });
  });

  it('PUT rejects non-boolean fields with 400', async () => {
    await request(app.getHttpServer())
      .put('/api/notifications/preferences')
      .send({ orderAlerts: 'yes' })
      .expect(400);
  });
});
