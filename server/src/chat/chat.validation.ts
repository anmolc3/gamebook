import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message content cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters'),
  type: z.enum(['TEXT', 'GAME_INVITE', 'GAME_RESULT', 'SYSTEM']).optional().default('TEXT'),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const createGroupSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Group name cannot be empty')
    .max(100, 'Group name cannot exceed 100 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().nullable(),
  avatarUrl: z.string().trim().optional().nullable(),
  memberIds: z.array(z.string()).min(1, 'Select at least one friend to add to the group'),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z.object({
  title: z.string().trim().min(1, 'Group name cannot be empty').max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  avatarUrl: z.string().trim().optional().nullable(),
});

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const addMembersSchema = z.object({
  memberIds: z.array(z.string()).min(1, 'At least one member ID is required'),
});

export type AddMembersInput = z.infer<typeof addMembersSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
