import type { AssetEventType } from '../events/asset-events.js';

export interface AuditEntry {
  assetId: string;
  action: AssetEventType;
  timestamp: string;
  assetTitle: string;
  details: Record<string, unknown>;
}

export class AuditStore {
  private entries: AuditEntry[] = [];

  add(entry: AuditEntry): void {
    this.entries.push(entry);
  }

  getByAssetId(assetId: string): AuditEntry[] {
    return this.entries.filter((e) => e.assetId === assetId);
  }

  clear(): void {
    this.entries = [];
  }
}
