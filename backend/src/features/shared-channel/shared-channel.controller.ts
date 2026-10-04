import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { SharedChannelService } from './shared-channel.service';

@ApiTags('shared-channel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/channels')
export class SharedChannelController {
  constructor(private readonly sharedchannel: SharedChannelService) {}

  @Post()
  @Roles(UserRole.VENDOR)
  @HttpCode(HttpStatus.CREATED)
  async postApiChannels(@Req() req: Request, @Body() body: unknown) {
    return this.sharedchannel.createChannel(req.session!, body);
  }

  @Post(':id/messages')
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  async postApiChannelsIdMessages(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.sharedchannel.postMessage(req.session!, id, body);
  }

  @Get()
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER)
  async getApiChannels(@Req() req: Request) {
    return this.sharedchannel.listChannels(req.session!);
  }
}
