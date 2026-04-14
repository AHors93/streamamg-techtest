import { describe, it, expect, beforeEach } from 'vitest';
import { AssetStore } from '../src/store/asset-store.js';
import { AssetService, InvalidTransitionError } from '../src/services/asset-service.js';

describe('AssetService', () => {
  let store: AssetStore;
  let service: AssetService;

  beforeEach(() => {
    store = new AssetStore();
    service = new AssetService(store);
  });

  describe('createAsset', () => {
    it('creates an asset with processing status', () => {
      const asset = service.createAsset({ title: 'Test Video', contentType: 'video' });

      expect(asset.title).toBe('Test Video');
      expect(asset.contentType).toBe('video');
      expect(asset.status).toBe('processing');
      expect(asset.id).toBeDefined();
      expect(asset.createdAt).toBeDefined();
      expect(asset.updatedAt).toBeDefined();
    });

    it('stores optional description', () => {
      const asset = service.createAsset({
        title: 'Test',
        contentType: 'audio',
        description: 'A test audio asset',
      });

      expect(asset.description).toBe('A test audio asset');
    });
  });

  describe('getAsset', () => {
    it('returns asset by id', () => {
      const created = service.createAsset({ title: 'Test', contentType: 'video' });
      const found = service.getAsset(created.id);

      expect(found).toEqual(created);
    });

    it('returns undefined for non-existent id', () => {
      expect(service.getAsset('non-existent')).toBeUndefined();
    });
  });

  describe('listAssets', () => {
    it('returns all assets', () => {
      service.createAsset({ title: 'Video 1', contentType: 'video' });
      service.createAsset({ title: 'Audio 1', contentType: 'audio' });

      expect(service.listAssets()).toHaveLength(2);
    });

    it('filters by status', () => {
      const asset = service.createAsset({ title: 'Video', contentType: 'video' });
      service.processAsset(asset.id);

      const processing = service.listAssets({ status: 'processing' });
      const ready = service.listAssets({ status: 'ready' });

      expect(processing).toHaveLength(0);
      expect(ready).toHaveLength(1);
    });

    it('filters by content type', () => {
      service.createAsset({ title: 'Video', contentType: 'video' });
      service.createAsset({ title: 'Audio', contentType: 'audio' });

      const videos = service.listAssets({ contentType: 'video' });
      expect(videos).toHaveLength(1);
      expect(videos[0].contentType).toBe('video');
    });

    it('filters by both status and content type', () => {
      const v1 = service.createAsset({ title: 'Video 1', contentType: 'video' });
      service.createAsset({ title: 'Video 2', contentType: 'video' });
      service.processAsset(v1.id);

      const readyVideos = service.listAssets({ status: 'ready', contentType: 'video' });
      expect(readyVideos).toHaveLength(1);
      expect(readyVideos[0].title).toBe('Video 1');
    });
  });

  describe('updateAsset', () => {
    it('updates title and description', () => {
      const asset = service.createAsset({ title: 'Old Title', contentType: 'video' });
      const updated = service.updateAsset(asset.id, { title: 'New Title', description: 'Updated' });

      expect(updated?.title).toBe('New Title');
      expect(updated?.description).toBe('Updated');
    });

    it('returns undefined for non-existent asset', () => {
      expect(service.updateAsset('non-existent', { title: 'Test' })).toBeUndefined();
    });
  });

  describe('deleteAsset', () => {
    it('deletes an existing asset', () => {
      const asset = service.createAsset({ title: 'Test', contentType: 'video' });
      expect(service.deleteAsset(asset.id)).toBe(true);
      expect(service.getAsset(asset.id)).toBeUndefined();
    });

    it('returns false for non-existent asset', () => {
      expect(service.deleteAsset('non-existent')).toBe(false);
    });
  });

  describe('processAsset', () => {
    it('transitions from processing to ready', () => {
      const asset = service.createAsset({ title: 'Test', contentType: 'video' });
      const processed = service.processAsset(asset.id);

      expect(processed?.status).toBe('ready');
    });

    it('transitions from processing to failed', () => {
      const asset = service.createAsset({ title: 'Test', contentType: 'video' });
      const failed = service.processAsset(asset.id, true);

      expect(failed?.status).toBe('failed');
    });

    it('returns undefined for non-existent asset', () => {
      expect(service.processAsset('non-existent')).toBeUndefined();
    });
  });

  describe('status transitions', () => {
    it('allows processing → ready → published → unpublished → published', () => {
      const asset = service.createAsset({ title: 'Test', contentType: 'video' });

      service.processAsset(asset.id);
      service.updateAsset(asset.id, { status: 'published' });
      service.updateAsset(asset.id, { status: 'unpublished' });
      const final = service.updateAsset(asset.id, { status: 'published' });

      expect(final?.status).toBe('published');
    });

    it('rejects invalid transition: processing → published', () => {
      const asset = service.createAsset({ title: 'Test', contentType: 'video' });

      expect(() => service.updateAsset(asset.id, { status: 'published' }))
        .toThrow(InvalidTransitionError);
    });

    it('rejects invalid transition: ready → unpublished', () => {
      const asset = service.createAsset({ title: 'Test', contentType: 'video' });
      service.processAsset(asset.id);

      expect(() => service.updateAsset(asset.id, { status: 'unpublished' }))
        .toThrow(InvalidTransitionError);
    });

    it('rejects invalid transition: failed → ready', () => {
      const asset = service.createAsset({ title: 'Test', contentType: 'video' });
      service.processAsset(asset.id, true);

      expect(() => service.processAsset(asset.id))
        .toThrow(InvalidTransitionError);
    });
  });
});
