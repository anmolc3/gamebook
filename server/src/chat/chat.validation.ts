import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message content cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters'),
  type: z.enum(['TEXT', 'GAME_INVITE', 'GAME_RESULT']).optional().default('TEXT'),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
