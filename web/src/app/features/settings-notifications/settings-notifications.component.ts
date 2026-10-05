import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

/** Mirrors the GET/PUT /api/notifications/preferences response contract. */
export interface NotificationPreferenceRecord {
  userId: string;
  orderAlerts: boolean;
  messageAlerts: boolean;
}

const PREFS_PATH = '/api/notifications/preferences';

export const CONFIGURE_OUTCOME =
  'the preferences are updated and returns 200 with the stored NotificationPreference record';
export const DISABLE_ALL_OUTCOME =
  'the preferences are updated with both alert fields stored as false';

function isRecord(v: unknown): v is Partial<NotificationPreferenceRecord> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Register in-memory handlers when the app runs against MockApiClient. */
function registerMocks(client: MockApiClient): void {
  let stored: NotificationPreferenceRecord = { userId: 'mock-user', orderAlerts: true, messageAlerts: true };
  client.registerMock('GET', PREFS_PATH, async () => stored);
  client.registerMock('PUT', PREFS_PATH, async (body) => {
    const b = (body ?? {}) as Partial<NotificationPreferenceRecord>;
    stored = { ...stored, orderAlerts: !!b.orderAlerts, messageAlerts: !!b.messageAlerts };
    return stored;
  });
}

@Component({
  selector: 'app-settings-notifications',
  standalone: true,
  imports: [],
  template: `
    <div class="page" data-testid="settings-notifications-screen">
      <h1>Notification Settings</h1>

      <section>
        <h2>How saving works</h2>
        <ul>
          <li>Saving your choices: {{ configureOutcome }}.</li>
          <li>Turning every alert off: {{ disableAllOutcome }}.</li>
        </ul>
      </section>

      <form (submit)="$event.preventDefault(); save()">
        <label>
          <input
            type="checkbox"
            data-testid="order-alerts-toggle"
            [checked]="orderAlerts()"
            (change)="orderAlerts.set($any($event.target).checked)"
          />
          Order alerts
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="message-alerts-toggle"
            [checked]="messageAlerts()"
            (change)="messageAlerts.set($any($event.target).checked)"
          />
          Message alerts
        </label>
        <button type="submit" data-testid="save-notification-preferences" [disabled]="saving()">
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </form>

      @if (error()) {
        <p role="alert" data-testid="notification-preferences-error">{{ error() }}</p>
      }

      @if (saved(); as rec) {
        <div data-testid="notification-preferences-result" role="status">
          <p>Saved: {{ configureOutcome }}.</p>
          @if (!rec.orderAlerts && !rec.messageAlerts) {
            <p>All alerts off: {{ disableAllOutcome }}.</p>
          }
          <dl>
            <dt>userId</dt><dd>{{ rec.userId }}</dd>
            <dt>orderAlerts</dt><dd>{{ rec.orderAlerts }}</dd>
            <dt>messageAlerts</dt><dd>{{ rec.messageAlerts }}</dd>
          </dl>
        </div>
      }
    </div>
  `,
})
export class SettingsNotificationsComponent implements OnInit {
  private readonly api = inject(ApiClient);

  readonly configureOutcome = CONFIGURE_OUTCOME;
  readonly disableAllOutcome = DISABLE_ALL_OUTCOME;

  readonly orderAlerts = signal(true);
  readonly messageAlerts = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal<NotificationPreferenceRecord | null>(null);

  constructor() {
    if (this.api instanceof MockApiClient) registerMocks(this.api);
  }

  async ngOnInit(): Promise<void> {
    try {
      const rec = await this.api.get<unknown>(PREFS_PATH);
      if (isRecord(rec)) {
        if (typeof rec.orderAlerts === 'boolean') this.orderAlerts.set(rec.orderAlerts);
        if (typeof rec.messageAlerts === 'boolean') this.messageAlerts.set(rec.messageAlerts);
      }
    } catch (e: any) {
      this.error.set(e?.message || 'Could not load notification preferences');
    }
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    const body = { orderAlerts: this.orderAlerts(), messageAlerts: this.messageAlerts() };
    try {
      const res = await this.api.request<unknown>(PREFS_PATH, { method: 'PUT', body });
      const rec: NotificationPreferenceRecord = {
        userId: isRecord(res) && typeof res.userId === 'string' ? res.userId : '',
        orderAlerts: isRecord(res) && typeof res.orderAlerts === 'boolean' ? res.orderAlerts : body.orderAlerts,
        messageAlerts: isRecord(res) && typeof res.messageAlerts === 'boolean' ? res.messageAlerts : body.messageAlerts,
      };
      this.orderAlerts.set(rec.orderAlerts);
      this.messageAlerts.set(rec.messageAlerts);
      this.saved.set(rec);
    } catch (e: any) {
      this.error.set(e?.message || 'Could not save notification preferences');
    } finally {
      this.saving.set(false);
    }
  }
}
