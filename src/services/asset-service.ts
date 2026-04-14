import { v4 as uuidv4 } from 'uuid';
import type { Asset, AssetFilter, AssetStatusType, CreateAssetInput, UpdateAssetInput } from '../types/asset.js';
import type { AssetStore } from '../store/asset-store.js';
import { assetEmitter, type AssetEventType } from '../events/asset-events.js';

const VALID_TRANSITIONS: Record<AssetStatusType, AssetStatusType[]> = {
  processing: ['ready', 'failed'],
  ready: ['published'],
  published: ['unpublished'],
  unpublished: ['published'],
  failed: [],
};

export class AssetService {
  constructor(private store: AssetStore) {}

  createAsset(input: CreateAssetInput): Asset {
    const now = new Date().toISOString();
    const asset: Asset = {
      id: uuidv4(),
      title: input.title,
      description: input.description,
      contentType: input.contentType,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
    };

    this.store.create(asset);
    this.emit('asset.created', asset);
    return asset;
  }

  getAsset(id: string): Asset | undefined {
    return this.store.getById(id);
  }

  listAssets(filter?: AssetFilter): Asset[] {
    return this.store.getAll(filter);
  }

  updateAsset(id: string, input: UpdateAssetInput): Asset | undefined {
    const existing = this.store.getById(id);
    if (!existing) return undefined;

    if (input.status) {
      this.validateTransition(existing.status, input.status);
    }

    const updated = this.store.update(id, {
      ...input,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) return undefined;

    if (input.status === 'published') {
      this.emit('asset.published', updated);
    } else if (input.status === 'unpublished') {
      this.emit('asset.unpublished', updated);
    } else {
      this.emit('asset.updated', updated);
    }

    return updated;
  }

  deleteAsset(id: string): boolean {
    const existing = this.store.getById(id);
    if (!existing) return false;

    this.store.delete(id);
    this.emit('asset.deleted', existing);
    return true;
  }

  processAsset(id: string, fail = false): Asset | undefined {
    const existing = this.store.getById(id);
    if (!existing) return undefined;

    this.validateTransition(existing.status, fail ? 'failed' : 'ready');

    const newStatus = fail ? 'failed' : 'ready';
    const updated = this.store.update(id, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) return undefined;

    const eventType: AssetEventType = fail
      ? 'asset.processing.failed'
      : 'asset.processing.complete';

    this.emit(eventType, updated);
    return updated;
  }

  private validateTransition(from: AssetStatusType, to: AssetStatusType): void {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new InvalidTransitionError(from, to);
    }
  }

  private emit(type: AssetEventType, asset: Asset): void {
    assetEmitter.emit(type, {
      type,
      assetId: asset.id,
      timestamp: new Date().toISOString(),
      data: asset,
    });
  }
}

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid status transition: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}
