import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRoomStore } from '~/stores/useRoomStore'
import type { UserData } from '~/types/game'

describe('useRoomStore', () => {
  let roomStore: ReturnType<typeof useRoomStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    roomStore = useRoomStore()
  })

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      expect(roomStore.roomId).toBe('')
      expect(roomStore.leaderName).toBe(null)
      expect(roomStore.users).toEqual([])
    })
  })

  describe('Room ID Management', () => {
    it('should set room ID correctly', () => {
      const testRoomId = 'room-123'
      roomStore.setRoomId(testRoomId)
      
      expect(roomStore.roomId).toBe(testRoomId)
    })

    it('should update room ID when called multiple times', () => {
      roomStore.setRoomId('room-1')
      expect(roomStore.roomId).toBe('room-1')
      
      roomStore.setRoomId('room-2')
      expect(roomStore.roomId).toBe('room-2')
    })

    it('should handle empty string room ID', () => {
      roomStore.setRoomId('test-room')
      roomStore.setRoomId('')
      
      expect(roomStore.roomId).toBe('')
    })

    it('should handle special characters in room ID', () => {
      const specialRoomId = 'room-@#$%^&*()_+'
      roomStore.setRoomId(specialRoomId)
      
      expect(roomStore.roomId).toBe(specialRoomId)
    })
  })

  describe('Leader Management', () => {
    it('should set leader name correctly', () => {
      const leaderName = 'player1'
      roomStore.setLeader(leaderName)
      
      expect(roomStore.leaderName).toBe(leaderName)
    })

    it('should set leader to null', () => {
      roomStore.setLeader('player1')
      roomStore.setLeader(null)
      
      expect(roomStore.leaderName).toBe(null)
    })

    it('should update leader when called multiple times', () => {
      roomStore.setLeader('player1')
      expect(roomStore.leaderName).toBe('player1')
      
      roomStore.setLeader('player2')
      expect(roomStore.leaderName).toBe('player2')
    })

    it('should handle empty string leader name', () => {
      roomStore.setLeader('')
      expect(roomStore.leaderName).toBe('')
    })

    it('should handle special characters in leader name', () => {
      const specialName = 'player@#$%'
      roomStore.setLeader(specialName)
      
      expect(roomStore.leaderName).toBe(specialName)
    })
  })

  describe('Users Management', () => {
    it('should set users array correctly', () => {
      const testUsers: UserData[] = [
        { username: 'player1', color: '#FF0000', alive: true },
        { username: 'player2', color: '#00FF00', alive: true }
      ]
      
      roomStore.setUsers(testUsers)
      
      expect(roomStore.users).toEqual(testUsers)
      expect(roomStore.users).toHaveLength(2)
    })

    it('should replace users array completely', () => {
      const initialUsers: UserData[] = [
        { username: 'player1', color: '#FF0000', alive: true }
      ]
      
      const newUsers: UserData[] = [
        { username: 'player2', color: '#00FF00', alive: false },
        { username: 'player3', color: '#0000FF', alive: true }
      ]
      
      roomStore.setUsers(initialUsers)
      expect(roomStore.users).toHaveLength(1)
      
      roomStore.setUsers(newUsers)
      expect(roomStore.users).toEqual(newUsers)
      expect(roomStore.users).toHaveLength(2)
    })

    it('should handle empty users array', () => {
      const users: UserData[] = [
        { username: 'player1', color: '#FF0000', alive: true }
      ]
      
      roomStore.setUsers(users)
      expect(roomStore.users).toHaveLength(1)
      
      roomStore.setUsers([])
      expect(roomStore.users).toEqual([])
      expect(roomStore.users).toHaveLength(0)
    })

    it('should handle users with different alive states', () => {
      const mixedUsers: UserData[] = [
        { username: 'alivePlayer', color: '#FF0000', alive: true },
        { username: 'deadPlayer', color: '#00FF00', alive: false }
      ]
      
      roomStore.setUsers(mixedUsers)
      
      expect(roomStore.users[0]!.alive).toBe(true)
      expect(roomStore.users[1]!.alive).toBe(false)
    })

    it('should handle users with various color formats', () => {
      const coloredUsers: UserData[] = [
        { username: 'player1', color: '#FF0000', alive: true },
        { username: 'player2', color: 'red', alive: true },
        { username: 'player3', color: '', alive: true }
      ]
      
      roomStore.setUsers(coloredUsers)
      
      expect(roomStore.users[0]!.color).toBe('#FF0000')
      expect(roomStore.users[1]!.color).toBe('red')
      expect(roomStore.users[2]!.color).toBe('')
    })

    it('should handle large users array', () => {
      const manyUsers: UserData[] = Array.from({ length: 100 }, (_, i) => ({
        username: `player${i}`,
        color: `#${i.toString(16).padStart(6, '0')}`,
        alive: i % 2 === 0
      }))
      
      roomStore.setUsers(manyUsers)
      
      expect(roomStore.users).toHaveLength(100)
      expect(roomStore.users[0]!.username).toBe('player0')
      expect(roomStore.users[99]!.username).toBe('player99')
    })
  })

  describe('Store Reactivity', () => {
    it('should be reactive to room ID changes', () => {
      const initialRoomId = roomStore.roomId
      roomStore.setRoomId('new-room')
      
      expect(roomStore.roomId).not.toBe(initialRoomId)
      expect(roomStore.roomId).toBe('new-room')
    })

    it('should be reactive to leader changes', () => {
      const initialLeader = roomStore.leaderName
      roomStore.setLeader('newLeader')
      
      expect(roomStore.leaderName).not.toBe(initialLeader)
      expect(roomStore.leaderName).toBe('newLeader')
    })

    it('should be reactive to users changes', () => {
      const initialUsers = roomStore.users
      const newUsers: UserData[] = [
        { username: 'testUser', color: '#123456', alive: true }
      ]
      
      roomStore.setUsers(newUsers)
      
      expect(roomStore.users).not.toBe(initialUsers)
      expect(roomStore.users).toEqual(newUsers)
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle complete room setup', () => {
      const roomId = 'tetris-championship'
      const leaderName = 'grandMaster'
      const users: UserData[] = [
        { username: 'grandMaster', color: '#FFD700', alive: true },
        { username: 'challenger1', color: '#C0C0C0', alive: true },
        { username: 'challenger2', color: '#CD7F32', alive: false }
      ]
      
      roomStore.setRoomId(roomId)
      roomStore.setLeader(leaderName)
      roomStore.setUsers(users)
      
      expect(roomStore.roomId).toBe(roomId)
      expect(roomStore.leaderName).toBe(leaderName)
      expect(roomStore.users).toEqual(users)
    })

    it('should handle room reset scenario', () => {
      // Setup initial state
      roomStore.setRoomId('active-room')
      roomStore.setLeader('player1')
      roomStore.setUsers([
        { username: 'player1', color: '#FF0000', alive: true },
        { username: 'player2', color: '#00FF00', alive: false }
      ])
      
      // Reset all values
      roomStore.setRoomId('')
      roomStore.setLeader(null)
      roomStore.setUsers([])
      
      // Check reset state
      expect(roomStore.roomId).toBe('')
      expect(roomStore.leaderName).toBe(null)
      expect(roomStore.users).toEqual([])
    })

    it('should maintain reference to users array', () => {
      const originalUsers: UserData[] = [
        { username: 'original', color: '#000000', alive: true }
      ]
      
      roomStore.setUsers(originalUsers)
      
      // Modify the original array (this affects store since it shares the reference)
      originalUsers.push({ username: 'added', color: '#FFFFFF', alive: false })
      
      // Store should now have both users since it shares the reference
      expect(roomStore.users).toHaveLength(2)
      expect(roomStore.users[0]!.username).toBe('original')
      expect(roomStore.users[1]!.username).toBe('added')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined values gracefully', () => {
      // These shouldn't normally happen due to TypeScript, but testing robustness
      roomStore.setRoomId(undefined as any)
      roomStore.setLeader(undefined as any)
      
      expect(roomStore.roomId).toBeUndefined()
      expect(roomStore.leaderName).toBeUndefined()
    })

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000)
      
      roomStore.setRoomId(longString)
      roomStore.setLeader(longString)
      
      expect(roomStore.roomId).toBe(longString)
      expect(roomStore.leaderName).toBe(longString)
    })

    it('should handle unicode characters', () => {
      const unicodeRoomId = '🎮🎯🎲'
      const unicodeLeader = '玩家👑'
      
      roomStore.setRoomId(unicodeRoomId)
      roomStore.setLeader(unicodeLeader)
      
      expect(roomStore.roomId).toBe(unicodeRoomId)
      expect(roomStore.leaderName).toBe(unicodeLeader)
    })
  })
})