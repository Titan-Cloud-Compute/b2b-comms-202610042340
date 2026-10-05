import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

/** Mirrors the order-management contract (Order / OrderItem). */
export interface OrderItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  orderId?: string;
}
export interface Order {
  id: string;
  status: string;
  customerId?: string;
  vendorId?: string;
  orderItems?: OrderItem[];
}

export const PENDING_OUTCOME =
  'the order is stored with status "pending" and returns 201 with the created Order record';
export const CONFIRMED_OUTCOME =
  'the order is updated to status "confirmed" and displays to the customer as confirmed';

function registerOrderMocks(api: MockApiClient): void {
  const orders: Order[] = [];
  let seq = 0;
  api.registerMock('GET', '/api/orders', async () => orders);
  api.registerMock('POST', '/api/orders', async (body: any) => {
    const order: Order = {
      id: `mock-order-${++seq}`,
      status: 'pending',
      customerId: 'mock-customer',
      vendorId: body?.vendorId,
      orderItems: body?.items ?? [],
    };
    orders.unshift(order);
    return order;
  });
}

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page" data-testid="orders-screen">
      <h1>Orders</h1>

      <section aria-labelledby="po-heading">
        <h2 id="po-heading">Place a purchase order</h2>
        <p>When you submit a purchase order, {{ pendingOutcome }}.</p>
        <form (ngSubmit)="submitOrder()">
          <label>Vendor ID <input name="vendorId" [(ngModel)]="vendorId" required /></label>
          @for (item of items; track $index) {
            <fieldset>
              <label>Description <input [name]="'desc' + $index" [(ngModel)]="item.description" required /></label>
              <label>Quantity <input type="number" min="1" [name]="'qty' + $index" [(ngModel)]="item.quantity" /></label>
              <label>Unit price <input type="number" min="0" step="0.01" [name]="'price' + $index" [(ngModel)]="item.unitPrice" /></label>
              @if (items.length > 1) {
                <button type="button" (click)="removeItem($index)">Remove</button>
              }
            </fieldset>
          }
          <button type="button" (click)="addItem()">Add item</button>
          <button type="submit" [disabled]="busy()">Submit purchase order</button>
        </form>
      </section>

      <section aria-labelledby="queue-heading">
        <h2 id="queue-heading">Vendor confirmation queue</h2>
        <p>When the vendor confirms an order with an estimated delivery date, {{ confirmedOutcome }}.</p>
        @if (pendingOrders().length === 0) {
          <p>No pending orders.</p>
        }
        @for (order of pendingOrders(); track order.id) {
          <div>
            <span>Order {{ order.id }} — {{ order.status }}</span>
            <label>Estimated delivery
              <input type="date" [name]="'eta-' + order.id" [(ngModel)]="eta[order.id]" />
            </label>
            <button type="button" [disabled]="busy() || !eta[order.id]" (click)="confirmOrder(order)">Confirm</button>
          </div>
        }
      </section>

      <section aria-labelledby="list-heading">
        <h2 id="list-heading">Your orders</h2>
        @if (orders().length === 0) {
          <p>No orders yet.</p>
        }
        <ul>
          @for (order of orders(); track order.id) {
            <li>Order {{ order.id }} — status: {{ order.status }}</li>
          }
        </ul>
      </section>

      @if (message()) {
        <p role="status">{{ message() }}</p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
    </div>
  `,
})
export class OrderManagementComponent implements OnInit {
  private readonly api = inject(ApiClient);

  readonly pendingOutcome = PENDING_OUTCOME;
  readonly confirmedOutcome = CONFIRMED_OUTCOME;

  readonly orders = signal<Order[]>([]);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal('');

  vendorId = '';
  items: OrderItem[] = [{ description: '', quantity: 1, unitPrice: 0 }];
  eta: Record<string, string> = {};

  constructor() {
    if (this.api instanceof MockApiClient) registerOrderMocks(this.api);
  }

  ngOnInit(): void {
    void this.load();
  }

  pendingOrders(): Order[] {
    return this.orders().filter((o) => o.status === 'pending');
  }

  addItem(): void {
    this.items = [...this.items, { description: '', quantity: 1, unitPrice: 0 }];
  }

  removeItem(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
  }

  async load(): Promise<void> {
    try {
      const list = await this.api.get<Order[]>('/api/orders');
      this.orders.set(Array.isArray(list) ? list : []);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not load orders');
    }
  }

  async submitOrder(): Promise<void> {
    this.error.set('');
    this.message.set('');
    if (!this.vendorId.trim()) {
      this.error.set('Vendor ID is required');
      return;
    }
    this.busy.set(true);
    try {
      const created = await this.api.post<Order>('/api/orders', {
        vendorId: this.vendorId.trim(),
        items: this.items
          .filter((i) => i.description.trim())
          .map((i) => ({ description: i.description.trim(), quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
      });
      if (created?.id) this.orders.update((list) => [created, ...list.filter((o) => o.id !== created.id)]);
      this.message.set(`Order ${created?.id ?? ''} submitted: ${PENDING_OUTCOME}.`);
      this.vendorId = '';
      this.items = [{ description: '', quantity: 1, unitPrice: 0 }];
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not submit order');
    } finally {
      this.busy.set(false);
    }
  }

  async confirmOrder(order: Order): Promise<void> {
    this.error.set('');
    this.message.set('');
    const estimatedDelivery = this.eta[order.id];
    if (!estimatedDelivery) return;
    this.busy.set(true);
    try {
      const res = await this.api.patch<Order>(`/api/orders/${order.id}/confirm`, { estimatedDelivery });
      const status = res?.status ?? 'confirmed';
      this.orders.update((list) => list.map((o) => (o.id === order.id ? { ...o, status } : o)));
      this.message.set(`Order ${order.id} confirmed for ${estimatedDelivery}: ${CONFIRMED_OUTCOME}.`);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not confirm order');
    } finally {
      this.busy.set(false);
    }
  }
}
