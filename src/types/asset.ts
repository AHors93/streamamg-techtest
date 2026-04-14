import { z } from 'zod';

export const AssetStatus = z.enum([
  'processing',
  'ready',
  'published',
  'unpublished',
  'failed',
]);

export const ContentType = z.enum([
  'video',
  'audio',
  'live-stream',
]);

export const AssetSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  contentType: ContentType,
  status: AssetStatus,
  url: z.string().url().optional(),
  duration: z.number().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateAssetSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  contentType: ContentType,
});

export const UpdateAssetSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['published', 'unpublished']).optional(),
});

export const AssetFilterSchema = z.object({
  status: AssetStatus.optional(),
  contentType: ContentType.optional(),
});

export type Asset = z.infer<typeof AssetSchema>;
export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
export type AssetFilter = z.infer<typeof AssetFilterSchema>;
export type AssetStatusType = z.infer<typeof AssetStatus>;
export type ContentTypeType = z.infer<typeof ContentType>;
