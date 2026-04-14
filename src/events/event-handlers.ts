import { assetEmitter, type AssetEvent, type AssetEventType } from './asset-events.js';
import type { AssetStore } from '../store/asset-store.js';
import type { AuditStore } from '../store/audit-store.js';

export function registerEventHandlers(store: AssetStore, auditStore: AuditStore): void {
  const allEventTypes: AssetEventType[] = [
    'asset.created',
    'asset.updated',
    'asset.processing.complete',
    'asset.processing.failed',
    'asset.published',
    'asset.unpublished',
    'asset.deleted',
  ];

  for (const type of allEventTypes) {
    assetEmitter.on(type, (event: AssetEvent) => {
      auditStore.add({
        assetId: event.assetId,
        action: event.type,
        timestamp: event.timestamp,
        assetTitle: event.data.title,
        details: { status: event.data.status },
      });
    });
  }

  assetEmitter.on('asset.processing.complete', (event: AssetEvent) => {
    const dummyUrl = `https://cdn.streamamg.com/media/${event.assetId}/playlist.m3u8`;
    const dummyDuration = Math.floor(Math.random() * 7200) + 30;

    store.update(event.assetId, {
      url: dummyUrl,
      duration: dummyDuration,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[event] Processing complete for "${event.data.title}" — URL assigned`);
  });

  assetEmitter.on('asset.processing.failed', (event: AssetEvent) => {
    console.log(`[event] Processing failed for "${event.data.title}"`);
  });

  assetEmitter.on('asset.published', (event: AssetEvent) => {
    console.log(`[event] Asset published: "${event.data.title}"`);
  });

  assetEmitter.on('asset.unpublished', (event: AssetEvent) => {
    console.log(`[event] Asset unpublished: "${event.data.title}"`);
  });

  assetEmitter.on('asset.created', (event: AssetEvent) => {
    console.log(`[event] Asset created: "${event.data.title}" (${event.data.contentType})`);
  });

  assetEmitter.on('asset.deleted', (event: AssetEvent) => {
    console.log(`[event] Asset deleted: "${event.data.title}"`);
  });
}
