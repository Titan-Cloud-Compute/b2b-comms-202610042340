import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { NotificationPreferencesService } from './notification-preferences.service';
import type {
  GetApiNotificationsPreferencesResponseDto,
  PutApiNotificationsPreferencesResponseDto,
} from './notification-preferences.dto';

/**
 * Notification preferences of the SESSION user. Every authenticated user
 * manages only their own record (scoped by session userId).
 */
@ApiTags('notification-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/notifications/preferences')
export class NotificationPreferencesController {
  constructor(private readonly notificationpreferences: NotificationPreferencesService) {}

  private userId(req: Request): string {
    const id = req.session?.userId;
    if (!id) throw new UnauthorizedException('not authenticated');
    return id;
  }

  @Put()
  @HttpCode(200)
  async putApiNotificationsPreferences(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<PutApiNotificationsPreferencesResponseDto> {
    const b = (body ?? {}) as Record<string, unknown>;
    if (typeof b['orderAlerts'] !== 'boolean' || typeof b['messageAlerts'] !== 'boolean') {
      throw new BadRequestException('orderAlerts and messageAlerts must be booleans');
    }
    return this.notificationpreferences.put(this.userId(req), {
      orderAlerts: b['orderAlerts'],
      messageAlerts: b['messageAlerts'],
    });
  }

  @Get()
  async getApiNotificationsPreferences(
    @Req() req: Request,
  ): Promise<GetApiNotificationsPreferencesResponseDto> {
    return this.notificationpreferences.get(this.userId(req));
  }
}
