import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SharedChannelService } from './shared-channel.service';

function makePrisma() {
  return {
    vendorProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'vp1', userId: 'u-vendor' }) },
    channel: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c1', ...data })),
      findMany: jest.fn().mockResolvedValue([{ id: 'c1', name: 'General', vendorId: 'vp1' }]),
      findUnique: jest.fn().mockResolvedValue({ id: 'c1', name: 'General', vendorId: 'vp1' }),
    },
    message: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'm1', ...data })),
    },
  };
}

describe('SharedChannelService', () => {
  it('vendor creates a channel stored with its vendor profile id', async () => {
    const prisma = makePrisma();
    const svc = new SharedChannelService(prisma as any);
    const res = await svc.createChannel({ userId: 'u-vendor', role: 'VENDOR' }, { name: 'General' });
    expect(res).toEqual({ id: 'c1', name: 'General' });
    expect(prisma.channel.create).toHaveBeenCalledWith({
      data: { name: 'General', vendorId: 'vp1', vendorProfileId: 'vp1' },
    });
  });

  it('rejects an empty channel name', async () => {
    const svc = new SharedChannelService(makePrisma() as any);
    await expect(svc.createChannel({ userId: 'u-vendor', role: 'VENDOR' }, { name: ' ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lists channels for customers', async () => {
    const svc = new SharedChannelService(makePrisma() as any);
    await expect(svc.listChannels({ userId: 'u-cust', role: 'CUSTOMER' })).resolves.toEqual([
      { id: 'c1', name: 'General' },
    ]);
  });

  it('customer posts a message with senderId from the session', async () => {
    const prisma = makePrisma();
    const svc = new SharedChannelService(prisma as any);
    const res = await svc.postMessage({ userId: 'u-cust', role: 'CUSTOMER' }, 'c1', { body: 'Hello' });
    expect(res).toEqual({ id: 'm1', body: 'Hello', channelId: 'c1' });
    expect(prisma.message.create).toHaveBeenCalledWith({ data: { body: 'Hello', channelId: 'c1', senderId: 'u-cust' } });
  });

  it('forbids a vendor posting in another vendor channel', async () => {
    const prisma = makePrisma();
    prisma.vendorProfile.findUnique.mockResolvedValue({ id: 'vp2', userId: 'u-other' });
    const svc = new SharedChannelService(prisma as any);
    await expect(svc.postMessage({ userId: 'u-other', role: 'VENDOR' }, 'c1', { body: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
