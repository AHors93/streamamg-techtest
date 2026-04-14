import type { Asset, AssetFilter } from '../types/asset.js';

export class AssetStore {
  private assets = new Map<string, Asset>();

  create(asset: Asset): Asset {
    this.assets.set(asset.id, asset);
    return asset;
  }

  getById(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  getAll(filter?: AssetFilter): Asset[] {
    let results = Array.from(this.assets.values());

    if (filter?.status) {
      results = results.filter((a) => a.status === filter.status);
    }

    if (filter?.contentType) {
      results = results.filter((a) => a.contentType === filter.contentType);
    }

    return results;
  }

  update(id: string, fields: Partial<Asset>): Asset | undefined {
    const existing = this.assets.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...fields };
    this.assets.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.assets.delete(id);
  }

  clear(): void {
    this.assets.clear();
  }
}
