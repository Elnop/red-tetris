import { Socket } from 'socket.io-client'
import type { UserData } from './game';
import type { ItemType } from './items';

declare module 'socket.io-client' {
  interface Socket {
    // Events emitted by the client
    emit(event: 'check-username', data: { room: string; username: string }, callback: (response: { available: boolean }) => void): this;
    emit(event: 'check-room-exists', data: { room: string }, callback: (response: { exists: boolean }) => void): this;
    emit(event: 'join-room', data: { room: string; username: string; powerUpsEnabled?: boolean; itemSpawnRate?: number }): this;
    emit(event: 'leave-room', data: { room: string; username: string }): this;
    emit(event: 'tetris-start', data: { room: string; seed: number }): this;
    emit(event: 'tetris-grid', data: { room: string; username: string; grid: string[]; color: string }): this;
    emit(event: 'tetris-send-lines', data: { room: string; count: number }): this;
    emit(event: 'tetris-game-over', data: { room: string; username: string }): this;
    emit(event: 'item-used', data: { room: string; username: string; itemType: ItemType; targetUsername?: string }): this;

    // Events received by the client
    on(event: 'connect', callback: () => void): this;
    on(event: 'connect_error', callback: (error: Error) => void): this;
    on(event: 'username-taken', callback: () => void): this;
    on(event: 'room-users', callback: (data: { users: UserData[] }) => void): this;
    on(event: 'room-leader', callback: (data: { username: string | null }) => void): this;
    on(event: 'user-joined', callback: (data: { username: string }) => void): this;
    on(event: 'user-left', callback: (username: string) => void): this;
    on(event: 'tetris-start', callback: (data: { seed: number; powerUpsEnabled?: boolean; itemSpawnRate?: number }) => void): this;
    on(event: 'tetris-ghost', callback: (data: { username: string; grid: string[]; color: string }) => void): this;
    on(event: 'tetris-win', callback: () => void): this;
    on(event: 'player-lost', callback: (data: { username: string }) => void): this;
    on(event: 'tetris-receive-lines', callback: (data: { count: number }) => void): this;
    on(event: 'game-ended', callback: (data: { winner: string }) => void): this;
    on(event: 'game-state', callback: (data: { isPlaying: boolean }) => void): this;
    on(event: 'room-settings', callback: (data: { powerUpsEnabled: boolean; itemSpawnRate: number }) => void): this;
    on(event: 'item-effect', callback: (data: { sourceUsername: string; targetUsername: string; itemType: ItemType; effectData?: any }) => void): this;
  }
}

export type TypedSocket = Socket
