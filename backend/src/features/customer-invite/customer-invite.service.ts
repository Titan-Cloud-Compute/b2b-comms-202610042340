import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FeatureService } from '../../common/feature';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetApiAdminCustomersResponseDto,
  PostApiAdminCustomersInviteResponseDto,
} from './customer-invite.dto';

@Injectable()
export class CustomerInviteService extends FeatureService {
  constructor(prisma: PrismaService) {
    super(prisma, ['Customer', 'User']);
  }

  async invite(rawEmail: string | undefined): Promise<PostApiAdminCustomersInviteResponseDto> {
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    const existing = await this.prisma.customer.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Customer already exists');
    }

    const customer = await this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({ data: { email, role: UserRole.CUSTOMER } });
      }
      const userCustomer = await tx.customer.findUnique({ where: { userId: user.id } });
      if (userCustomer) {
        throw new ConflictException('Customer already exists');
      }
      return tx.customer.create({ data: { email, userId: user.id } });
    });

    return { customerId: customer.id, email: customer.email, invitationSent: true };
  }

  async list(): Promise<GetApiAdminCustomersResponseDto[]> {
    const customers = await this.prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
    return customers.map((c) => ({ id: c.id, email: c.email }));
  }
}
