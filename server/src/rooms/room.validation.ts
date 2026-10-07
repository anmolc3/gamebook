import { z } from 'zod';

export const createRoomSchema = z.object({
  gameType: z.string().trim().min(2).default('TICTACTOE'),
  isPrivate: z.boolean().optional().default(true),
  maxPlayers: z.number().int().min(2).max(10).optional(),
  gameSettings: z.record(z.string(), z.any()).optional(),
});

export const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Room code must be at least 3 characters')
    .max(10, 'Room code must be at most 10 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Room code must be alphanumeric'),
});

export const toggleReadySchema = z.object({
  isReady: z.boolean().optional(),
});

export const matchmakeSchema = z.object({
  gameType: z.string().trim().min(2).default('TICTACTOE'),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type ToggleReadyInput = z.infer<typeof toggleReadySchema>;
export type MatchmakeInput = z.infer<typeof matchmakeSchema>;
