import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetStore } from '../src/store/asset-store.js';
import { AuditStore } from '../src/store/audit-store.js';
import { AssetService } from '../src/services/asset-service.js';
import { assetEmitter } from '../src/events/asset-events.js';
import { registerEventHandlers } from '../src/events/event-handlers.js';

describe('Asset Events', () => {
  let store: AssetStore;
  let service: AssetService;

  beforeEach(() => {
    assetEmitter.removeAllListeners();
    store = new AssetStore();
    service = new AssetService(store);
  });

  it('emits asset.created when asset is created', () => {
    const handler = vi.fn();
    assetEmitter.on('asset.created', handler);

    service.createAsset({ title: 'Test', contentType: 'video' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].type).toBe('asset.created');
  });

  it('emits asset.processing.complete when processed successfully', () => {
    const handler = vi.fn();
    assetEmitter.on('asset.processing.complete', handler);

    const asset = service.createAsset({ title: 'Test', contentType: 'video' });
    service.processAsset(asset.id);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].data.status).toBe('ready');
  });

  it('emits asset.processing.failed when processing fails', () => {
    const handler = vi.fn();
    assetEmitter.on('asset.processing.failed', handler);

    const asset = service.createAsset({ title: 'Test', contentType: 'video' });
    service.processAsset(asset.id, true);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].data.status).toBe('failed');
  });

  it('emits asset.published when asset is published', () => {
    const handler = vi.fn();
    assetEmitter.on('asset.published', handler);

    const asset = service.createAsset({ title: 'Test', contentType: 'video' });
    service.processAsset(asset.id);
    service.updateAsset(asset.id, { status: 'published' });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('emits asset.deleted when asset is deleted', () => {
    const handler = vi.fn();
    assetEmitter.on('asset.deleted', handler);

    const asset = service.createAsset({ title: 'Test', contentType: 'video' });
    service.deleteAsset(asset.id);

    expect(handler).toHaveBeenCalledOnce();
  });

  describe('event handlers', () => {
    let auditStore: AuditStore;

    beforeEach(() => {
      auditStore = new AuditStore();
      registerEventHandlers(store, auditStore);
    });

    it('assigns URL and duration on processing complete', () => {
      const asset = service.createAsset({ title: 'Test', contentType: 'video' });
      service.processAsset(asset.id);

      const updated = store.getById(asset.id);
      expect(updated?.url).toContain(asset.id);
      expect(updated?.duration).toBeGreaterThan(0);
    });

    it('records audit entry for every state change', () => {
      const asset = service.createAsset({ title: 'Test', contentType: 'video' });
      service.processAsset(asset.id);
      service.updateAsset(asset.id, { status: 'published' });

      const history = auditStore.getByAssetId(asset.id);
      expect(history).toHaveLength(3);
      expect(history[0].action).toBe('asset.created');
      expect(history[1].action).toBe('asset.processing.complete');
      expect(history[2].action).toBe('asset.published');
    });

    it('audit entries contain asset title and timestamp', () => {
      const asset = service.createAsset({ title: 'Audit Test', contentType: 'audio' });

      const history = auditStore.getByAssetId(asset.id);
      expect(history[0].assetTitle).toBe('Audit Test');
      expect(history[0].timestamp).toBeDefined();
    });
  });
});
