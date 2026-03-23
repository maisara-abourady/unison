// Structured error types for all failure modes in the app.
import type { Platform, Track } from './index';

export type AppError =
  | { type: 'DB_ERROR'; message: string; cause?: unknown }
  | { type: 'AUTH_EXPIRED'; platform: Platform }
  | { type: 'AUTH_FAILED'; platform: Platform; reason: string }
  | { type: 'API_ERROR'; platform: Platform; statusCode: number; message: string }
  | { type: 'SOUNDCLOUD_RESOLVE_FAILED'; url: string; reason: string }
  | { type: 'DEEP_LINK_FAILED'; track: Track }
  | { type: 'MIGRATION_FAILED'; version: number; cause: unknown };
