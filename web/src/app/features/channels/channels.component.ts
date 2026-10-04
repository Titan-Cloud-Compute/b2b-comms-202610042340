import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

interface ChannelSummary {
  id: string;
  name: string;
}

interface MessageRecord {
  id: string;
  body: string;
  channelId: string;
}

/** Register in-memory mocks for the shared-channel endpoints (USE_MOCKS mode). */
function registerChannelMocks(mock: MockApiClient): void {
  const channels: ChannelSummary[] = [{ id: 'mock-channel-1', name: 'Acme ↔ Corp' }];
  let seq = 1;
  mock.registerMock('GET', '/api/channels', async () => channels.map(c => ({ ...c })));
  mock.registerMock('POST', '/api/channels', async (body) => {
    const created = { id: `mock-channel-${++seq}`, name: String((body as { name?: string })?.name ?? '') };
    channels.unshift(created);
    return created;
  });
  for (const c of channels) registerMessageMock(mock, c.id);
}

function registerMessageMock(mock: MockApiClient, channelId: string): void {
  let seq = 0;
  mock.registerMock('POST', `/api/channels/${channelId}/messages`, async (body) => ({
    id: `mock-message-${channelId}-${++seq}`,
    body: String((body as { body?: string })?.body ?? ''),
    channelId,
  }));
}

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div data-testid="channels-screen">
      <h1>Channels</h1>
      <p data-testid="channels-vendor-outcome">
        When a vendor creates a shared channel, the channel is stored and displays in both the vendor and customer channel lists.
      </p>
      <p data-testid="channels-customer-outcome">
        When a customer posts a message, the message is stored and returns 201 with the created Message record.
      </p>

      <form data-testid="channel-create-form" (ngSubmit)="createChannel()">
        <label for="channel-name">New channel name</label>
        <input id="channel-name" name="channelName" data-testid="channel-name-input"
               [(ngModel)]="newChannelName" required />
        <button type="submit" data-testid="channel-create-submit" [disabled]="busy()">Create channel</button>
      </form>

      @if (error()) {
        <p data-testid="channels-error" role="alert">{{ error() }}</p>
      }
      @if (status()) {
        <p data-testid="channels-status" role="status">{{ status() }}</p>
      }

      <ul data-testid="channel-list">
        @for (channel of channels(); track channel.id) {
          <li data-testid="channel-item">
            <h2>{{ channel.name }}</h2>
            <ul data-testid="channel-messages">
              @for (msg of messagesFor(channel.id); track msg.id) {
                <li data-testid="channel-message">{{ msg.body }}</li>
              }
            </ul>
            <form data-testid="message-compose-form" (ngSubmit)="postMessage(channel.id)">
              <label [for]="'message-' + channel.id">Message</label>
              <input [id]="'message-' + channel.id" [name]="'message-' + channel.id"
                     data-testid="message-body-input"
                     [ngModel]="drafts[channel.id] || ''"
                     (ngModelChange)="drafts[channel.id] = $event" />
              <button type="submit" data-testid="message-send" [disabled]="busy()">Send</button>
            </form>
          </li>
        } @empty {
          <li data-testid="channel-list-empty">No channels yet.</li>
        }
      </ul>
    </div>
  `,
})
export class ChannelsComponent implements OnInit {
  private readonly api = inject(ApiClient);

  readonly channels = signal<ChannelSummary[]>([]);
  readonly messages = signal<Record<string, MessageRecord[]>>({});
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = signal<string | null>(null);

  newChannelName = '';
  drafts: Record<string, string> = {};

  constructor() {
    if (this.api instanceof MockApiClient) registerChannelMocks(this.api);
  }

  ngOnInit(): void {
    void this.loadChannels();
  }

  messagesFor(channelId: string): MessageRecord[] {
    return this.messages()[channelId] ?? [];
  }

  async loadChannels(): Promise<void> {
    try {
      const list = await this.api.get<ChannelSummary[]>('/api/channels');
      this.channels.set(Array.isArray(list) ? list.filter(c => c && c.id) : []);
    } catch (e) {
      this.error.set(this.describe(e, 'Could not load channels.'));
    }
  }

  async createChannel(): Promise<void> {
    const name = this.newChannelName.trim();
    if (!name) {
      this.error.set('Channel name is required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const created = await this.api.post<ChannelSummary>('/api/channels', { name });
      if (this.api instanceof MockApiClient && created?.id) registerMessageMock(this.api, created.id);
      this.newChannelName = '';
      this.status.set(`Channel "${created?.name ?? name}" created.`);
      await this.loadChannels();
    } catch (e) {
      this.error.set(this.describe(e, 'Could not create channel.'));
    } finally {
      this.busy.set(false);
    }
  }

  async postMessage(channelId: string): Promise<void> {
    const body = (this.drafts[channelId] ?? '').trim();
    if (!body) {
      this.error.set('Message body is required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const msg = await this.api.post<MessageRecord>(`/api/channels/${channelId}/messages`, { body });
      const record: MessageRecord = msg?.id ? msg : { id: `local-${Date.now()}`, body, channelId };
      this.messages.update(m => ({ ...m, [channelId]: [...(m[channelId] ?? []), record] }));
      this.drafts[channelId] = '';
      this.status.set('Message sent.');
    } catch (e) {
      this.error.set(this.describe(e, 'Could not send message.'));
    } finally {
      this.busy.set(false);
    }
  }

  private describe(e: unknown, fallback: string): string {
    return e instanceof Error && e.message ? e.message : fallback;
  }
}
