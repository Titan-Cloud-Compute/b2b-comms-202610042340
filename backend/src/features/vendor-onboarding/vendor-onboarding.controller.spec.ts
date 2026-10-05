import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VendorOnboardingController } from './vendor-onboarding.controller';
import { VendorOnboardingService } from './vendor-onboarding.service';

function makePrisma(profile: unknown = { id: 'vp1', userId: 'u1', companyName: 'Acme', contactEmail: 'a@acme.com' }) {
  return {
    vendorProfile: {
      upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ id: 'vp1', ...create })),
      findUnique: jest.fn().mockResolvedValue(profile),
    },
    document: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'd1', ...data })),
      findMany: jest.fn().mockResolvedValue([{ id: 'd1', filename: 'w9.pdf', status: 'pending', vendorProfileId: 'vp1' }]),
    },
  };
}

function makeController(prisma = makePrisma()) {
  const svc = new VendorOnboardingService(prisma as any);
  return { ctrl: new VendorOnboardingController(svc), prisma };
}

const req = { session: { userId: 'u1', email: 'vendor@acme.example.com', role: 'VENDOR' } } as any;

describe('VendorOnboardingController', () => {
  it('POST /api/vendor/profile stores the profile and returns the record', async () => {
    const { ctrl, prisma } = makeController();
    const res = await ctrl.postApiVendorProfile(req, { companyName: 'Acme', contactEmail: 'a@acme.com' });
    expect(res).toEqual({ id: 'vp1', companyName: 'Acme', contactEmail: 'a@acme.com' });
    expect(prisma.vendorProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { companyName: 'Acme', contactEmail: 'a@acme.com', userId: 'u1' } }),
    );
  });

  it('rejects an invalid profile', async () => {
    const { ctrl } = makeController();
    await expect(ctrl.postApiVendorProfile(req, { companyName: '', contactEmail: 'x' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('POST /api/vendor/documents stores the document with status pending', async () => {
    const { ctrl, prisma } = makeController();
    const res = await ctrl.postApiVendorDocuments(req, { filename: 'w9.pdf' });
    expect(res).toEqual({ id: 'd1', filename: 'w9.pdf', status: 'pending' });
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: { filename: 'w9.pdf', status: 'pending', vendorProfileId: 'vp1' },
    });
  });

  it('rejects document upload without a profile', async () => {
    const { ctrl } = makeController(makePrisma(null));
    await expect(ctrl.postApiVendorDocuments(req, { filename: 'w9.pdf' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('GET /api/vendor/documents lists the vendor document library', async () => {
    const { ctrl } = makeController();
    await expect(ctrl.getApiVendorDocuments(req)).resolves.toEqual([{ id: 'd1', filename: 'w9.pdf', status: 'pending' }]);
  });
});
