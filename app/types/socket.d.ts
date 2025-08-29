import { Socket } from 'socket.io-client'
import type { UserData } from './game';

declare module 'socket.io-client' {
  interface Socket {
    // Événements émis par le client
    emit(event: 'check-username', data: { room: string; username: string }, callback: (response: { available: boolean }) => void): this;
    emit(event: 'join-room', data: { room: string; username: string }): this;
    emit(event: 'leave-room', data: { room: string; username: string }): this;
    emit(event: 'tetris-start', data: { room: string; seed: number }): this;
    emit(event: 'tetris-grid', data: { room: string; username: string; grid: string[]; color: string }): this;
    emit(event: 'tetris-send-lines', data: { room: string; count: number }): this;
    emit(event: 'tetris-game-over', data: { room: string; username: string }): this;
    
    // Événements reçus par le client
    on(event: 'connect', callback: () => void): this;
    on(event: 'connect_error', callback: (error: Error) => void): this;
    on(event: 'username-taken', callback: () => void): this;
    on(event: 'room-users', callback: (data: { users: UserData[] }) => void): this;
    on(event: 'room-leader', callback: (data: { username: string | null }) => void): this;
    on(event: 'user-joined', callback: (data: { username: string }) => void): this;
    on(event: 'user-left', callback: (username: string) => void): this;
    on(event: 'tetris-start', callback: (data: { seed: number }) => void): this;
    on(event: 'tetris-ghost', callback: (data: { username: string; grid: string[]; color: string }) => void): this;
    on(event: 'tetris-win', callback: () => void): this;
    on(event: 'player-lost', callback: (data: { username: string }) => void): this;
    on(event: 'tetris-receive-lines', callback: (data: { count: number }) => void): this;
    on(event: 'game-ended', callback: (data: { winner: string }) => void): this;
  }
}

export type TypedSocket = Socket
