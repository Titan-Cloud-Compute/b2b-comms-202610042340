import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GetApiVendorDocumentsResponseDto,
  PostApiVendorDocumentsResponseDto,
  PostApiVendorProfileResponseDto,
} from './vendor-onboarding.dto';

export interface VendorActor {
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
export class VendorOnboardingService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['VendorProfile', 'Document'] as const);
  }

  async submitProfile(actor: VendorActor, body: unknown): Promise<PostApiVendorProfileResponseDto> {
    const b = (body ?? {}) as { companyName?: unknown; contactEmail?: unknown };
    const companyName = requireText(b.companyName, 'companyName');
    const contactEmail = requireText(b.contactEmail, 'contactEmail');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      throw new BadRequestException('contactEmail must be a valid email');
    }
    const profile = await this.model('VendorProfile').upsert({
      where: { userId: actor.userId },
      create: { companyName, contactEmail, userId: actor.userId },
      update: { companyName, contactEmail },
    });
    return { id: profile.id, companyName: profile.companyName, contactEmail: profile.contactEmail };
  }

  async uploadDocument(actor: VendorActor, body: unknown): Promise<PostApiVendorDocumentsResponseDto> {
    const filename = requireText((body as { filename?: unknown } | undefined)?.filename, 'filename');
    const profile = await this.model('VendorProfile').findUnique({ where: { userId: actor.userId } });
    if (!profile) throw new NotFoundException('vendor profile not found; submit your company profile first');
    const doc = await this.model('Document').create({
      data: { filename, status: 'pending', vendorProfileId: profile.id },
    });
    return { id: doc.id, filename: doc.filename, status: doc.status };
  }

  async listDocuments(actor: VendorActor): Promise<GetApiVendorDocumentsResponseDto[]> {
    const profile = await this.model('VendorProfile').findUnique({ where: { userId: actor.userId } });
    if (!profile) return [];
    const docs = await this.model('Document').findMany({
      where: { vendorProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d: { id: string; filename: string; status: string }) => ({
      id: d.id,
      filename: d.filename,
      status: d.status,
    }));
  }
}
