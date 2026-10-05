import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

interface VendorProfileRecord {
  id: string;
  companyName: string;
  contactEmail: string;
}

interface VendorDocumentRecord {
  id: string;
  filename: string;
  status: string;
}

/** Register in-memory mocks for the vendor-onboarding endpoints (USE_MOCKS mode). */
function registerVendorOnboardingMocks(mock: MockApiClient): void {
  const docs: VendorDocumentRecord[] = [];
  let seq = 0;
  mock.registerMock('POST', '/api/vendor/profile', async (body) => {
    const b = (body ?? {}) as { companyName?: string; contactEmail?: string };
    return { id: 'mock-vendor-profile-1', companyName: String(b.companyName ?? ''), contactEmail: String(b.contactEmail ?? '') };
  });
  mock.registerMock('POST', '/api/vendor/documents', async (body) => {
    const created = { id: `mock-document-${++seq}`, filename: String((body as { filename?: string })?.filename ?? ''), status: 'pending' };
    docs.unshift(created);
    return created;
  });
  mock.registerMock('GET', '/api/vendor/documents', async () => docs.map(d => ({ ...d })));
}

export const PROFILE_OUTCOME = 'the profile is stored and returns 201 with the created VendorProfile record';
export const DOCUMENT_OUTCOME = 'the document is stored with status "pending" and displays in the vendor document library';

@Component({
  selector: 'app-vendor-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page" data-testid="vendor-profile-screen">
      <h1>Vendor Profile</h1>

      <section>
        <h2>Company profile</h2>
        <p data-testid="vendor-profile-outcome">When you submit your company profile, {{ profileOutcome }}.</p>
        <form data-testid="vendor-profile-form" [formGroup]="profileForm" (ngSubmit)="submitProfile()">
          <label for="vendor-company-name">Company name</label>
          <input id="vendor-company-name" formControlName="companyName" data-testid="vendor-company-name-input" />
          <label for="vendor-contact-email">Contact email</label>
          <input id="vendor-contact-email" type="email" formControlName="contactEmail" data-testid="vendor-contact-email-input" />
          <button type="submit" data-testid="vendor-profile-submit" [disabled]="busy()">Submit profile</button>
        </form>
        @if (profile(); as p) {
          <p data-testid="vendor-profile-result" role="status">
            Saved: {{ p.companyName }} ({{ p.contactEmail }}) — {{ profileOutcome }}.
          </p>
        }
      </section>

      <section>
        <h2>Compliance documents</h2>
        <p data-testid="vendor-document-outcome">When you upload a compliance document, {{ documentOutcome }}.</p>
        <form data-testid="vendor-document-form" [formGroup]="documentForm" (ngSubmit)="uploadDocument()">
          <label for="vendor-document-filename">Document filename</label>
          <input id="vendor-document-filename" formControlName="filename" data-testid="vendor-document-filename-input" />
          <button type="submit" data-testid="vendor-document-submit" [disabled]="busy()">Upload document</button>
        </form>
        @if (uploadStatus()) {
          <p data-testid="vendor-document-result" role="status">{{ uploadStatus() }}</p>
        }

        <ul data-testid="vendor-document-library">
          @for (doc of documents(); track doc.id) {
            <li data-testid="vendor-document-item">{{ doc.filename }} — {{ doc.status }}</li>
          } @empty {
            <li data-testid="vendor-document-library-empty">No documents uploaded yet.</li>
          }
        </ul>
      </section>

      @if (error()) {
        <p data-testid="vendor-profile-error" role="alert">{{ error() }}</p>
      }
    </div>
  `,
})
export class VendorProfileComponent implements OnInit {
  private readonly api = inject(ApiClient);
  private readonly fb = inject(FormBuilder);

  readonly profileOutcome = PROFILE_OUTCOME;
  readonly documentOutcome = DOCUMENT_OUTCOME;

  readonly profileForm = this.fb.nonNullable.group({
    companyName: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
  });
  readonly documentForm = this.fb.nonNullable.group({
    filename: ['', Validators.required],
  });

  readonly profile = signal<VendorProfileRecord | null>(null);
  readonly documents = signal<VendorDocumentRecord[]>([]);
  readonly uploadStatus = signal<string | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    if (this.api instanceof MockApiClient) registerVendorOnboardingMocks(this.api);
  }

  ngOnInit(): void {
    void this.loadDocuments();
  }

  async loadDocuments(): Promise<void> {
    try {
      const list = await this.api.get<VendorDocumentRecord[]>('/api/vendor/documents');
      this.documents.set(Array.isArray(list) ? list.filter(d => d && d.id) : []);
    } catch (e) {
      this.error.set(this.describe(e, 'Could not load documents.'));
    }
  }

  async submitProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.error.set('Company name and a valid contact email are required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const body = this.profileForm.getRawValue();
      const created = await this.api.post<VendorProfileRecord>('/api/vendor/profile', body);
      this.profile.set(created?.id ? created : { id: '', ...body });
    } catch (e) {
      this.error.set(this.describe(e, 'Could not save profile.'));
    } finally {
      this.busy.set(false);
    }
  }

  async uploadDocument(): Promise<void> {
    const filename = this.documentForm.getRawValue().filename.trim();
    if (!filename) {
      this.error.set('Document filename is required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const doc = await this.api.post<VendorDocumentRecord>('/api/vendor/documents', { filename });
      this.documentForm.reset();
      this.uploadStatus.set(`"${doc?.filename ?? filename}" uploaded with status "${doc?.status ?? 'pending'}".`);
      await this.loadDocuments();
    } catch (e) {
      this.error.set(this.describe(e, 'Could not upload document.'));
    } finally {
      this.busy.set(false);
    }
  }

  private describe(e: unknown, fallback: string): string {
    return e instanceof Error && e.message ? e.message : fallback;
  }
}
