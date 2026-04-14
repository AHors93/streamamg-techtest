import { EventEmitter } from 'events';
import type { Asset } from '../types/asset.js';

export type AssetEventType =
  | 'asset.created'
  | 'asset.updated'
  | 'asset.processing.complete'
  | 'asset.processing.failed'
  | 'asset.published'
  | 'asset.unpublished'
  | 'asset.deleted';

export interface AssetEvent {
  type: AssetEventType;
  assetId: string;
  timestamp: string;
  data: Asset;
}

export const assetEmitter = new EventEmitter();
assetEmitter.setMaxListeners(100);
