import { z } from 'zod';

export const createLocationSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Location name must be at least 2 characters'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius_meters: z.number().int().positive().default(100),
  }),
});

export const updateLocationSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radius_meters: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  }),
});
