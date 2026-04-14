import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { Express } from 'express';

describe('Asset API', () => {
  let app: Express;

  beforeEach(() => {
    const result = createApp();
    app = result.app;
  });

  describe('POST /assets', () => {
    it('creates an asset and returns 201', async () => {
      const res = await request(app)
        .post('/assets')
        .send({ title: 'My Video', contentType: 'video' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('My Video');
      expect(res.body.status).toBe('processing');
      expect(res.body.id).toBeDefined();
    });

    it('returns 400 for missing title', async () => {
      const res = await request(app)
        .post('/assets')
        .send({ contentType: 'video' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('returns 400 for invalid content type', async () => {
      const res = await request(app)
        .post('/assets')
        .send({ title: 'Test', contentType: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /assets', () => {
    it('returns empty array when no assets exist', async () => {
      const res = await request(app).get('/assets');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all assets', async () => {
      await request(app).post('/assets').send({ title: 'V1', contentType: 'video' });
      await request(app).post('/assets').send({ title: 'A1', contentType: 'audio' });

      const res = await request(app).get('/assets');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters by status', async () => {
      const created = await request(app).post('/assets').send({ title: 'V1', contentType: 'video' });
      await request(app).post(`/assets/${created.body.id}/process`);
      await request(app).post('/assets').send({ title: 'V2', contentType: 'video' });

      const res = await request(app).get('/assets?status=ready');

      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('ready');
    });

    it('filters by content type', async () => {
      await request(app).post('/assets').send({ title: 'V1', contentType: 'video' });
      await request(app).post('/assets').send({ title: 'A1', contentType: 'audio' });

      const res = await request(app).get('/assets?contentType=audio');

      expect(res.body).toHaveLength(1);
      expect(res.body[0].contentType).toBe('audio');
    });
  });

  describe('GET /assets/:id', () => {
    it('returns a single asset', async () => {
      const created = await request(app).post('/assets').send({ title: 'Test', contentType: 'video' });
      const res = await request(app).get(`/assets/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Test');
    });

    it('returns 404 for non-existent asset', async () => {
      const res = await request(app).get('/assets/non-existent');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /assets/:id', () => {
    it('updates asset title', async () => {
      const created = await request(app).post('/assets').send({ title: 'Old', contentType: 'video' });
      const res = await request(app)
        .patch(`/assets/${created.body.id}`)
        .send({ title: 'New' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New');
    });

    it('publishes an asset that is ready', async () => {
      const created = await request(app).post('/assets').send({ title: 'Test', contentType: 'video' });
      await request(app).post(`/assets/${created.body.id}/process`);

      const res = await request(app)
        .patch(`/assets/${created.body.id}`)
        .send({ status: 'published' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('published');
    });

    it('returns 409 for invalid status transition', async () => {
      const created = await request(app).post('/assets').send({ title: 'Test', contentType: 'video' });

      const res = await request(app)
        .patch(`/assets/${created.body.id}`)
        .send({ status: 'published' });

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /assets/:id', () => {
    it('deletes an asset and returns 204', async () => {
      const created = await request(app).post('/assets').send({ title: 'Test', contentType: 'video' });
      const res = await request(app).delete(`/assets/${created.body.id}`);

      expect(res.status).toBe(204);
    });

    it('returns 404 for non-existent asset', async () => {
      const res = await request(app).delete('/assets/non-existent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /assets/:id/process', () => {
    it('transitions asset to ready', async () => {
      const created = await request(app).post('/assets').send({ title: 'Test', contentType: 'video' });
      const res = await request(app).post(`/assets/${created.body.id}/process`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });

    it('transitions asset to failed with ?fail=true', async () => {
      const created = await request(app).post('/assets').send({ title: 'Test', contentType: 'video' });
      const res = await request(app).post(`/assets/${created.body.id}/process?fail=true`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('failed');
    });
  });

  describe('GET /assets/:id/history', () => {
    it('returns audit trail for an asset', async () => {
      const created = await request(app).post('/assets').send({ title: 'Test', contentType: 'video' });
      await request(app).post(`/assets/${created.body.id}/process`);
      await request(app).patch(`/assets/${created.body.id}`).send({ status: 'published' });

      const res = await request(app).get(`/assets/${created.body.id}/history`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].action).toBe('asset.created');
      expect(res.body[1].action).toBe('asset.processing.complete');
      expect(res.body[2].action).toBe('asset.published');
    });

    it('returns 404 for non-existent asset', async () => {
      const res = await request(app).get('/assets/non-existent/history');

      expect(res.status).toBe(404);
    });
  });
});
