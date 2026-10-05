import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

interface InvoiceResponse {
  id: string;
  orderId: string;
  amount: number;
}

interface InvoiceDownloadResponse {
  id: string;
  downloadUrl: string;
}

let mocksRegistered = false;

/** Register mock handlers for the invoice endpoints when running against MockApiClient. */
function registerInvoiceMocks(api: ApiClient): void {
  if (mocksRegistered || !(api instanceof MockApiClient)) return;
  mocksRegistered = true;
  const store = new Map<string, InvoiceResponse>();
  api.registerMock<InvoiceResponse>('POST', '/api/invoices', async (body) => {
    const b = (body ?? {}) as { orderId?: string; amount?: number };
    const id = (globalThis.crypto?.randomUUID?.() ?? `inv-${Date.now()}`) as string;
    const invoice = { id, orderId: String(b.orderId ?? ''), amount: Number(b.amount ?? 0) };
    store.set(id, invoice);
    return invoice;
  });
  const origRequest = api.request.bind(api);
  api.request = (async (path: string, opts?: any) => {
    const m = /^\/api\/invoices\/([^/]+)\/download$/.exec(path);
    if (m && (opts?.method ?? 'GET').toUpperCase() === 'GET') {
      return { id: m[1], downloadUrl: `/api/invoices/${m[1]}/file` } as InvoiceDownloadResponse;
    }
    return origRequest(path, opts);
  }) as ApiClient['request'];
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page" data-testid="invoices-screen">
      <h1>Invoices</h1>

      <section>
        <h2>Generate an invoice</h2>
        <p>Generate an invoice for a confirmed order: the invoice is created and returns 201 with the invoice id available for download.</p>
        <form data-testid="invoice-generate-form" (ngSubmit)="generate()">
          <label>
            Order ID
            <input name="orderId" data-testid="invoice-order-id" [(ngModel)]="orderId" required />
          </label>
          <label>
            Amount
            <input name="amount" type="number" step="0.01" min="0.01" data-testid="invoice-amount" [(ngModel)]="amount" required />
          </label>
          <button type="submit" data-testid="invoice-generate-submit" [disabled]="busy()">Generate invoice</button>
        </form>
        @if (created(); as inv) {
          <p data-testid="invoice-created">Invoice created: <strong>{{ inv.id }}</strong> (order {{ inv.orderId }}, amount {{ inv.amount }})</p>
        }
      </section>

      <section>
        <h2>Download an invoice</h2>
        <p>Request the download link: the response returns 200 with a downloadUrl pointing to the stored invoice.</p>
        <form data-testid="invoice-download-form" (ngSubmit)="download()">
          <label>
            Invoice ID
            <input name="invoiceId" data-testid="invoice-download-id" [(ngModel)]="invoiceId" required />
          </label>
          <button type="submit" data-testid="invoice-download-submit" [disabled]="busy()">Get download link</button>
        </form>
        @if (downloadUrl(); as url) {
          <p data-testid="invoice-download-link"><a [href]="url" target="_blank" rel="noopener">{{ url }}</a></p>
        }
      </section>

      @if (error(); as err) {
        <p role="alert" data-testid="invoice-error">{{ err }}</p>
      }
    </div>
  `,
})
export class InvoicesComponent {
  private readonly api = inject(ApiClient);

  orderId = '';
  amount: number | null = null;
  invoiceId = '';

  readonly busy = signal(false);
  readonly created = signal<InvoiceResponse | null>(null);
  readonly downloadUrl = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    registerInvoiceMocks(this.api);
  }

  async generate(): Promise<void> {
    if (!this.orderId || this.amount == null) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const inv = await this.api.post<InvoiceResponse>('/api/invoices', {
        orderId: this.orderId.trim(),
        amount: Number(this.amount),
      });
      this.created.set(inv);
      this.invoiceId = inv.id;
      this.downloadUrl.set(null);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to generate invoice');
    } finally {
      this.busy.set(false);
    }
  }

  async download(): Promise<void> {
    const id = this.invoiceId.trim();
    if (!id) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const res = await this.api.get<InvoiceDownloadResponse>(`/api/invoices/${encodeURIComponent(id)}/download`);
      this.downloadUrl.set(res.downloadUrl);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to get download link');
    } finally {
      this.busy.set(false);
    }
  }
}
