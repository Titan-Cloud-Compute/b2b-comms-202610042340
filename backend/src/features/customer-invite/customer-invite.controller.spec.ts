import { ConflictException, HttpStatus, RequestMethod } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { CustomerInviteController } from './customer-invite.controller';
import { CustomerInviteService } from './customer-invite.service';

function makePrisma() {
  const users: { id: string; email: string; role: string }[] = [];
  const customers: { id: string; email: string; userId: string; createdAt: Date }[] = [];
  let seq = 0;
  const prisma: any = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => users.find((u) => u.email === where.email) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const u = { id: `u${++seq}`, ...data };
        users.push(u);
        return u;
      }),
    },
    customer: {
      findUnique: jest.fn(async ({ where }: any) =>
        customers.find((c) => (where.email ? c.email === where.email : c.userId === where.userId)) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const c = { id: `c${++seq}`, createdAt: new Date(), ...data };
        customers.push(c);
        return c;
      }),
      findMany: jest.fn(async () => [...customers]),
    },
  };
  prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
  return { prisma, users, customers };
}

describe('CustomerInviteController', () => {
  it('is mounted at api/admin/customers with POST invite (201) and GET list', () => {
    expect(Reflect.getMetadata(PATH_METADATA, CustomerInviteController)).toBe('api/admin/customers');
    const proto = CustomerInviteController.prototype;
    expect(Reflect.getMetadata(PATH_METADATA, proto.postApiAdminCustomersInvite)).toBe('invite');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.postApiAdminCustomersInvite)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, proto.postApiAdminCustomersInvite)).toBe(HttpStatus.CREATED);
    expect(Reflect.getMetadata(METHOD_METADATA, proto.getApiAdminCustomers)).toBe(RequestMethod.GET);
  });

  it('creates a Customer and returns invitationSent true, then rejects a duplicate with 409', async () => {
    const { prisma, customers, users } = makePrisma();
    const controller = new CustomerInviteController(new CustomerInviteService(prisma));

    const res = await controller.postApiAdminCustomersInvite({ email: 'buyer@corp.example.com' });
    expect(res).toEqual({ customerId: customers[0].id, email: 'buyer@corp.example.com', invitationSent: true });
    expect(customers).toHaveLength(1);
    expect(users[0]).toMatchObject({ email: 'buyer@corp.example.com', role: 'CUSTOMER' });
    expect(customers[0].userId).toBe(users[0].id);

    const dup = controller.postApiAdminCustomersInvite({ email: 'buyer@corp.example.com' });
    await expect(dup).rejects.toBeInstanceOf(ConflictException);
    await expect(controller.postApiAdminCustomersInvite({ email: 'buyer@corp.example.com' }))
      .rejects.toMatchObject({ status: 409 });
    expect(customers).toHaveLength(1);

    const list = await controller.getApiAdminCustomers();
    expect(list).toEqual([{ id: customers[0].id, email: 'buyer@corp.example.com' }]);
  });
});
