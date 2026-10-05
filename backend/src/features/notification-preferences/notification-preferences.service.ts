import { Injectable } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GetApiNotificationsPreferencesResponseDto,
  PutApiNotificationsPreferencesRequestDto,
  PutApiNotificationsPreferencesResponseDto,
} from './notification-preferences.dto';

/** Defaults returned when the user has not stored preferences yet. */
const DEFAULTS = { orderAlerts: true, messageAlerts: true };

@Injectable()
export class NotificationPreferencesService extends FeatureService {
  constructor(private readonly db: PrismaService) {
    super(db, ['NotificationPreference']);
  }

  async get(userId: string): Promise<GetApiNotificationsPreferencesResponseDto> {
    const row = await this.db.notificationPreference.findUnique({ where: { userId } });
    if (!row) return { userId, ...DEFAULTS };
    return { userId: row.userId, orderAlerts: row.orderAlerts, messageAlerts: row.messageAlerts };
  }

  async put(
    userId: string,
    body: PutApiNotificationsPreferencesRequestDto,
  ): Promise<PutApiNotificationsPreferencesResponseDto> {
    const data = { orderAlerts: body.orderAlerts, messageAlerts: body.messageAlerts };
    const row = await this.db.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return { userId: row.userId, orderAlerts: row.orderAlerts, messageAlerts: row.messageAlerts };
  }
}
