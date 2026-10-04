import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, ApiError, ConflictError, MockApiClient } from '../../shared/api/api-client';

interface InviteCustomerResponse {
  customerId: string;
  email: string;
  invitationSent: boolean;
}

interface CustomerListItem {
  id: string;
  email: string;
}

const mockCustomers: CustomerListItem[] = [];

/** In-memory mocks for the customer-invite endpoints (used when USE_MOCKS is set). */
function registerCustomerInviteMocks(client: MockApiClient): void {
  client.registerMock('GET', '/api/admin/customers', async () => [...mockCustomers]);
  client.registerMock('POST', '/api/admin/customers/invite', async (body: any) => {
    const email = String(body?.email ?? '').trim().toLowerCase();
    if (mockCustomers.some((c) => c.email === email)) {
      throw new ConflictError('Customer already exists');
    }
    const customer = { id: `mock-${mockCustomers.length + 1}`, email };
    mockCustomers.push(customer);
    return { customerId: customer.id, email, invitationSent: true } as InviteCustomerResponse;
  });
}

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div data-testid="admin-customers-screen">
      <h1>Customer Management</h1>

      <section data-testid="invite-rules">
        <p>When you invite a new email, a Customer record is created and returns 201 with invitationSent true.</p>
        <p>If a customer with that email already exists, the response returns 409 error indicating the customer already exists.</p>
      </section>

      <form data-testid="invite-form" (ngSubmit)="invite()">
        <label for="invite-email">Customer email</label>
        <input
          id="invite-email"
          data-testid="invite-email"
          type="email"
          name="email"
          required
          [(ngModel)]="email"
        />
        <button data-testid="invite-submit" type="submit" [disabled]="submitting">Send invitation</button>
      </form>

      @if (successMessage) {
        <p data-testid="invite-success" role="status">{{ successMessage }}</p>
      }
      @if (errorMessage) {
        <p data-testid="invite-error" role="alert">{{ errorMessage }}</p>
      }

      <h2>Customers</h2>
      <ul data-testid="customer-list">
        @for (c of customers; track c.id) {
          <li data-testid="customer-row">{{ c.email }}</li>
        } @empty {
          <li data-testid="customer-list-empty">No customers invited yet.</li>
        }
      </ul>
    </div>
  `,
})
export class AdminCustomersComponent implements OnInit {
  private readonly api = inject(ApiClient);

  email = '';
  submitting = false;
  successMessage = '';
  errorMessage = '';
  customers: CustomerListItem[] = [];

  ngOnInit(): void {
    if (this.api instanceof MockApiClient) {
      registerCustomerInviteMocks(this.api);
    }
    void this.loadCustomers();
  }

  async loadCustomers(): Promise<void> {
    try {
      const list = await this.api.get<CustomerListItem[]>('/api/admin/customers');
      this.customers = Array.isArray(list) ? list : [];
    } catch {
      this.customers = [];
    }
  }

  async invite(): Promise<void> {
    const email = this.email.trim();
    this.successMessage = '';
    this.errorMessage = '';
    if (!email) {
      this.errorMessage = 'Please enter an email address.';
      return;
    }
    this.submitting = true;
    try {
      const res = await this.api.post<InviteCustomerResponse>('/api/admin/customers/invite', { email });
      this.successMessage = res?.invitationSent
        ? `Invitation sent to ${res.email ?? email}.`
        : `Customer ${email} created.`;
      this.email = '';
      await this.loadCustomers();
    } catch (err) {
      this.errorMessage =
        err instanceof ApiError && err.status === 409
          ? 'Customer already exists.'
          : 'Could not send the invitation. Please try again.';
    } finally {
      this.submitting = false;
    }
  }
}
