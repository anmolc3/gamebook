import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(30, 'Display name cannot exceed 30 characters')
    .optional(),
  bio: z
    .string()
    .max(200, 'Bio cannot exceed 200 characters')
    .optional(),
  avatarUrl: z.string().nullable().optional(),
  themePreference: z
    .enum(['coralMarble', 'moonViolet', 'violetDusk', 'midnightNeutral', 'forestGold'])
    .optional(),
  appearanceMode: z.enum(['system', 'light', 'dark']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
