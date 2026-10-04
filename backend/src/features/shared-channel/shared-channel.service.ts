import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GetApiChannelsResponseDto,
  PostApiChannelsIdMessagesResponseDto,
  PostApiChannelsResponseDto,
} from './shared-channel.dto';

export interface ChannelActor {
  userId: string;
  role: string;
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  return value.trim();
}

@Injectable()
export class SharedChannelService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Channel', 'Message', 'VendorProfile'] as const);
  }

  async createChannel(actor: ChannelActor, body: unknown): Promise<PostApiChannelsResponseDto> {
    const name = requireText((body as { name?: unknown } | undefined)?.name, 'name');
    const profile = await this.model('VendorProfile').findUnique({ where: { userId: actor.userId } });
    if (!profile) throw new ForbiddenException('vendor profile not found');
    const channel = await this.model('Channel').create({
      data: { name, vendorId: profile.id, vendorProfileId: profile.id },
    });
    return { id: channel.id, name: channel.name };
  }

  async listChannels(actor: ChannelActor): Promise<GetApiChannelsResponseDto[]> {
    let where: Record<string, unknown> = {};
    if (actor.role === 'VENDOR') {
      const profile = await this.model('VendorProfile').findUnique({ where: { userId: actor.userId } });
      if (!profile) return [];
      where = { vendorId: profile.id };
    }
    const channels = await this.model('Channel').findMany({ where, orderBy: { createdAt: 'desc' } });
    return channels.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
  }

  async postMessage(
    actor: ChannelActor,
    channelId: string,
    body: unknown,
  ): Promise<PostApiChannelsIdMessagesResponseDto> {
    const text = requireText((body as { body?: unknown } | undefined)?.body, 'body');
    const channel = await this.model('Channel').findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('channel not found');
    if (actor.role === 'VENDOR') {
      const profile = await this.model('VendorProfile').findUnique({ where: { userId: actor.userId } });
      if (!profile || profile.id !== channel.vendorId) throw new ForbiddenException('not a channel member');
    }
    const message = await this.model('Message').create({
      data: { body: text, channelId, senderId: actor.userId },
    });
    return { id: message.id, body: message.body, channelId: message.channelId };
  }
}
