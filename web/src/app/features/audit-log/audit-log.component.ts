import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiClient } from '../../shared/api/api-client.service';

/** AuditEntry — mirrors GET/POST /api/admin/audit-log response shape. */
export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div data-testid="admin-audit-log-screen">
      <h1>Audit Log</h1>
      <p data-testid="audit-log-view-outcome">a list of AuditEntry records is displayed in chronological order returns 200</p>
      <p data-testid="audit-log-record-outcome">the AuditEntry is stored and returns 201 with the created record</p>

      <form data-testid="audit-log-form" (ngSubmit)="record()">
        <input name="action" placeholder="Action" [(ngModel)]="action" required />
        <input name="userId" placeholder="User ID (uuid)" [(ngModel)]="userId" required />
        <button type="submit" [disabled]="saving()">Record entry</button>
      </form>
      @if (error()) { <p role="alert">{{ error() }}</p> }

      @if (loading()) {
        <p>Loading…</p>
      } @else if (sorted().length === 0) {
        <p data-testid="audit-log-empty">No audit entries yet.</p>
      } @else {
        <table data-testid="audit-log-table">
          <thead><tr><th>When</th><th>Action</th><th>User</th><th>ID</th></tr></thead>
          <tbody>
            @for (e of sorted(); track e.id) {
              <tr><td>{{ e.createdAt | date: 'medium' }}</td><td>{{ e.action }}</td><td>{{ e.userId }}</td><td>{{ e.id }}</td></tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class AuditLogComponent implements OnInit {
  private api = inject(ApiClient);

  readonly entries = signal<AuditEntry[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly sorted = computed(() =>
    [...this.entries()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  );

  action = '';
  userId = '';

  async ngOnInit(): Promise<void> {
    try {
      const rows = await this.api.get<AuditEntry[]>('admin/audit-log');
      this.entries.set(Array.isArray(rows) ? rows : []);
    } catch {
      this.error.set('Could not load the audit log.');
    } finally {
      this.loading.set(false);
    }
  }

  async record(): Promise<void> {
    if (!this.action.trim() || !this.userId.trim()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const created = await this.api.post<AuditEntry>('admin/audit-log', {
        action: this.action.trim(),
        userId: this.userId.trim(),
      });
      if (created && created.id) {
        this.entries.update((list) => [...list, { ...created, userId: created.userId ?? this.userId.trim() }]);
      }
      this.action = '';
      this.userId = '';
    } catch {
      this.error.set('Could not record the audit entry.');
    } finally {
      this.saving.set(false);
    }
  }
}
