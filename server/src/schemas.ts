import { z } from 'zod'
import { DIFFICULTY_VALUES, REQUEST_TOPIC_VALUES } from './questionBank.js'
import type {
  RoomCreatePayload,
  RoomJoinPayload,
  RoomReadyPayload,
  RoomSettings,
} from './types.js'

const questionCountSchema = z.union([z.literal(5), z.literal(10), z.literal(15)])
const secondsSchema = z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)])

export const roomSettingsSchema = z.object({
  topic: z.enum(REQUEST_TOPIC_VALUES),
  difficulty: z.enum(DIFFICULTY_VALUES),
  questionCount: questionCountSchema,
  secondsPerQuestion: secondsSchema,
}) satisfies z.ZodType<RoomSettings>

export const roomCreateSchema = z.object({
  nickname: z.string(),
  avatarId: z.string(),
  settings: roomSettingsSchema,
}) satisfies z.ZodType<RoomCreatePayload>

export const roomJoinSchema = z.object({
  roomCode: z.string(),
  nickname: z.string(),
  avatarId: z.string(),
  reconnectToken: z.string().optional(),
}) satisfies z.ZodType<RoomJoinPayload>

export const roomReadySchema = z.object({
  ready: z.boolean(),
}) satisfies z.ZodType<RoomReadyPayload>
