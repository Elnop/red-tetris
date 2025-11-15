import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSocketEmiters } from '~/composables/socketEmiters'
import { useRoomStore } from '~/stores/useRoomStore'
import { useUserStore } from '~/stores/useUserStore'
import { useGameStore } from '~/stores/useGameStore'

// Mock dependencies
vi.mock('nuxt/app', () => ({
  navigateTo: vi.fn(),
  useNuxtApp: vi.fn(() => ({
    $socket: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      connected: true
    }
  }))
}))

vi.mock('#imports', () => ({
  useGameStore: () => useGameStore(),
  onMounted: vi.fn((fn) => fn()),
  onUnmounted: vi.fn()
}))

vi.mock('pinia-plugin-persistedstate', () => ({
  piniaPluginPersistedstate: {
    localStorage: () => ({})
  }
}))

global.piniaPluginPersistedstate = {
  localStorage: () => ({})
}

describe('useSocketEmiters', () => {
  let roomStore: ReturnType<typeof useRoomStore>
  let userStore: ReturnType<typeof useUserStore>
  let gameStore: ReturnType<typeof useGameStore>
  let socketEmiters: ReturnType<typeof useSocketEmiters>
  let mockSocket: any
  let mockNavigateTo: any

  beforeEach(async () => {
    setActivePinia(createPinia())
    roomStore = useRoomStore()
    userStore = useUserStore()
    gameStore = useGameStore()
    
    // Setup mock socket
    const { useNuxtApp } = await import('nuxt/app')
    mockSocket = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      connected: true
    }
    vi.mocked(useNuxtApp).mockReturnValue({ $socket: mockSocket } as any)
    
    // Setup mock navigate
    const { navigateTo } = await import('nuxt/app')
    mockNavigateTo = vi.mocked(navigateTo)

    socketEmiters = useSocketEmiters()
  })

  describe('Basic Functionality', () => {
    it('should provide expected functions', () => {
      expect(typeof socketEmiters.emitUserNameIsTaken).toBe('function')
      expect(typeof socketEmiters.emitJoinRoom).toBe('function')
      expect(typeof socketEmiters.emitLeaveRoom).toBe('function')
      expect(typeof socketEmiters.emitStart).toBe('function')
      expect(typeof socketEmiters.emitGameOver).toBe('function')
      expect(typeof socketEmiters.emitGridUpdate).toBe('function')
      expect(typeof socketEmiters.emitLines).toBe('function')
      expect(typeof socketEmiters.initRoomSocketListeners).toBe('function')
      expect(typeof socketEmiters.initGameSocketListeners).toBe('function')
      expect(typeof socketEmiters.clearRoomSocketListeners).toBe('function')
      expect(typeof socketEmiters.clearGameSocketListeners).toBe('function')
    })
  })

  describe('Username Availability Check', () => {
    it('should check username availability', async () => {
      roomStore.setRoomId('test-room')
      userStore.username = 'testuser'
      
      // Mock the callback response
      mockSocket.emit.mockImplementation((event: string, data: any, callback: Function) => {
        if (event === 'check-username') {
          callback({ available: true })
        }
      })
      
      const isAvailable = await socketEmiters.emitUserNameIsTaken()
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'check-username',
        {
          room: 'test-room',
          username: 'testuser'
        },
        expect.any(Function)
      )
      expect(isAvailable).toBe(true)
    })

    it('should handle username not available', async () => {
      roomStore.setRoomId('test-room')
      userStore.username = 'takenuser'
      
      mockSocket.emit.mockImplementation((event: string, data: any, callback: Function) => {
        if (event === 'check-username') {
          callback({ available: false })
        }
      })
      
      const isAvailable = await socketEmiters.emitUserNameIsTaken()
      
      expect(isAvailable).toBe(false)
    })
  })

  describe('Room Operations', () => {
    it('should emit join room event when connected', () => {
      roomStore.setRoomId('game-room')
      userStore.username = 'player1'
      roomStore.setPowerUpsEnabled(true)
      roomStore.setItemSpawnRate(0.08)
      mockSocket.connected = true

      socketEmiters.emitJoinRoom()

      expect(mockSocket.emit).toHaveBeenCalledWith('join-room', {
        room: 'game-room',
        username: 'player1',
        powerUpsEnabled: true,
        itemSpawnRate: 0.08
      })
    })

    it('should queue join room when not connected', () => {
      roomStore.setRoomId('game-room')
      userStore.username = 'player1'
      mockSocket.connected = false
      
      // Should not throw and should handle the pending emit
      expect(() => socketEmiters.emitJoinRoom()).not.toThrow()
    })

    it('should emit leave room event', () => {
      roomStore.setRoomId('game-room')
      userStore.username = 'player1'
      
      socketEmiters.emitLeaveRoom()
      
      expect(mockSocket.emit).toHaveBeenCalledWith('leave-room', {
        room: 'game-room',
        username: 'player1'
      })
    })

    it('should not emit when room ID is missing', () => {
      roomStore.setRoomId('')
      userStore.username = 'player1'
      
      socketEmiters.emitJoinRoom()
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('should not emit when username is missing', () => {
      roomStore.setRoomId('game-room')
      userStore.username = null
      
      socketEmiters.emitJoinRoom()
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })

  describe('Game Events', () => {
    it('should emit game start event with seed', () => {
      roomStore.setRoomId('game-room')
      userStore.username = 'player1'
      const seed = 12345
      
      socketEmiters.emitStart(seed)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('tetris-start', {
        room: 'game-room',
        seed
      })
    })

    it('should emit grid update event', () => {
      roomStore.setRoomId('game-room')
      userStore.username = 'player1'
      userStore.userColor = '#FF0000'
      const gridData = ['1', '0', '1', '0']
      
      socketEmiters.emitGridUpdate(gridData)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('tetris-grid', {
        room: 'game-room',
        username: 'player1',
        grid: gridData,
        color: '#FF0000'
      })
    })

    it('should emit game over event', () => {
      roomStore.setRoomId('game-room')
      userStore.username = 'player1'
      
      socketEmiters.emitGameOver()
      
      expect(mockSocket.emit).toHaveBeenCalledWith('tetris-game-over', {
        room: 'game-room',
        username: 'player1'
      })
    })

    it('should emit lines penalty event', () => {
      roomStore.setRoomId('game-room')
      userStore.username = 'attacker'
      
      socketEmiters.emitLines(3)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('tetris-send-lines', {
        room: 'game-room',
        count: 3
      })
    })

    it('should not emit lines when count is zero', () => {
      roomStore.setRoomId('game-room')
      userStore.username = 'attacker'
      
      socketEmiters.emitLines(0)
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })

  describe('Socket Listeners Management', () => {
    it('should initialize room socket listeners', () => {
      const setIsRunning = vi.fn()
      const setGameFinished = vi.fn()
      
      socketEmiters.initRoomSocketListeners(setIsRunning, setGameFinished)
      
      expect(mockSocket.on).toHaveBeenCalledWith('room-users', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('room-leader', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('tetris-start', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('game-ended', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function))
    })

    it('should initialize game socket listeners', () => {
      const onGhost = vi.fn()
      const onUserLeft = vi.fn()
      const onPlayerLost = vi.fn()
      const addGarbageLines = vi.fn()
      
      socketEmiters.initGameSocketListeners(onGhost, onUserLeft, onPlayerLost, addGarbageLines)
      
      expect(mockSocket.on).toHaveBeenCalledWith('game-state', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('tetris-ghost', onGhost)
      expect(mockSocket.on).toHaveBeenCalledWith('user-left', onUserLeft)
      expect(mockSocket.on).toHaveBeenCalledWith('player-lost', onPlayerLost)
      expect(mockSocket.on).toHaveBeenCalledWith('tetris-receive-lines', expect.any(Function))
    })

    it('should clear room socket listeners', () => {
      socketEmiters.clearRoomSocketListeners()
      
      expect(mockSocket.off).toHaveBeenCalledWith('room-users')
      expect(mockSocket.off).toHaveBeenCalledWith('room-leader')
      expect(mockSocket.off).toHaveBeenCalledWith('tetris-start')
      expect(mockSocket.off).toHaveBeenCalledWith('game-ended')
    })

    it('should clear game socket listeners', () => {
      socketEmiters.clearGameSocketListeners()
      
      expect(mockSocket.off).toHaveBeenCalledWith('tetris-ghost')
      expect(mockSocket.off).toHaveBeenCalledWith('user-left')
      expect(mockSocket.off).toHaveBeenCalledWith('player-lost')
      expect(mockSocket.off).toHaveBeenCalledWith('tetris-win')
      expect(mockSocket.off).toHaveBeenCalledWith('tetris-receive-lines')
      expect(mockSocket.off).toHaveBeenCalledWith('game-state')
    })
  })

  describe('Event Handlers', () => {
    beforeEach(() => {
      const setIsRunning = vi.fn()
      const setGameFinished = vi.fn()
      socketEmiters.initRoomSocketListeners(setIsRunning, setGameFinished)
    })

    it('should handle room-users event', () => {
      const setUsersSpy = vi.spyOn(roomStore, 'setUsers')
      const setColorSpy = vi.spyOn(userStore, 'setColor')
      userStore.username = 'testuser'
      
      // Get the room-users handler
      const roomUsersCall = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'room-users')
      const roomUsersHandler = roomUsersCall![1]
      
      const usersData = [
        { username: 'testuser', color: '#FF0000', isAlive: true },
        { username: 'player2', color: '#00FF00', isAlive: true }
      ]
      
      roomUsersHandler({ users: usersData })
      
      expect(setUsersSpy).toHaveBeenCalledWith(usersData)
      expect(setColorSpy).toHaveBeenCalledWith('#FF0000')
    })

    it('should handle room-leader event', () => {
      const setLeaderSpy = vi.spyOn(roomStore, 'setLeader')
      
      // Get the room-leader handler
      const roomLeaderCall = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'room-leader')
      const roomLeaderHandler = roomLeaderCall![1]
      
      roomLeaderHandler({ username: 'leader1' })
      
      expect(setLeaderSpy).toHaveBeenCalledWith('leader1')
    })

    it('should handle tetris-start event', () => {
      const setIsRunning = vi.fn()
      const setGameFinished = vi.fn()
      
      // Reinitialize to get fresh mocks
      vi.clearAllMocks()
      socketEmiters.initRoomSocketListeners(setIsRunning, setGameFinished)
      
      const tetrisStartCall = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'tetris-start')
      const tetrisStartHandler = tetrisStartCall![1]
      
      const customEventSpy = vi.spyOn(window, 'dispatchEvent')
      
      tetrisStartHandler({ seed: 12345 })
      
      expect(setIsRunning).toHaveBeenCalledWith(true)
      expect(customEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tetris-start',
          detail: { seed: 12345 }
        })
      )
    })

    it('should handle game-ended event', () => {
      const setIsRunning = vi.fn()
      const setGameFinished = vi.fn()
      
      // Reinitialize to get fresh mocks
      vi.clearAllMocks()
      socketEmiters.initRoomSocketListeners(setIsRunning, setGameFinished)
      
      const gameEndedCall = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'game-ended')
      const gameEndedHandler = gameEndedCall![1]
      
      const onWinSpy = vi.spyOn(gameStore, 'onWin')
      
      gameEndedHandler({ winner: 'champion' })
      
      expect(setIsRunning).toHaveBeenCalledWith(false)
      expect(setGameFinished).toHaveBeenCalledWith(true)
      expect(onWinSpy).toHaveBeenCalledWith('champion')
    })

    it('should handle connect_error event', () => {
      const connectErrorCall = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'connect_error')
      const connectErrorHandler = connectErrorCall![1]
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      connectErrorHandler(new Error('Connection failed'))
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Connection error:', expect.any(Error))
      expect(mockNavigateTo).toHaveBeenCalledWith('/')
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Game State Events', () => {
    it('should handle game-state event', () => {
      const onGhost = vi.fn()
      const onUserLeft = vi.fn()
      const onPlayerLost = vi.fn()
      const addGarbageLines = vi.fn()
      
      socketEmiters.initGameSocketListeners(onGhost, onUserLeft, onPlayerLost, addGarbageLines)
      
      const gameStateCall = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'game-state')
      const gameStateHandler = gameStateCall![1]
      
      const setIsPlayingSpy = vi.spyOn(gameStore, 'setIsPlaying')
      
      gameStateHandler({ isPlaying: true })
      
      expect(setIsPlayingSpy).toHaveBeenCalledWith(true)
    })

    it('should handle tetris-receive-lines event', () => {
      const onGhost = vi.fn()
      const onUserLeft = vi.fn()
      const onPlayerLost = vi.fn()
      const addGarbageLines = vi.fn()
      
      socketEmiters.initGameSocketListeners(onGhost, onUserLeft, onPlayerLost, addGarbageLines)
      
      const receiveLinesCall = mockSocket.on.mock.calls.find((call: unknown[]) => call[0] === 'tetris-receive-lines')
      const receiveLinesHandler = receiveLinesCall![1]
      
      receiveLinesHandler({ count: 4 })
      
      expect(addGarbageLines).toHaveBeenCalledWith(4)
    })
  })

  describe('Edge Cases', () => {
    it('should handle disconnected socket for grid update', () => {
      mockSocket.connected = false
      roomStore.setRoomId('game-room')
      userStore.username = 'player1'
      
      socketEmiters.emitGridUpdate(['1', '0', '1'])
      
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    it('should handle user color fallback', () => {
      roomStore.setRoomId('game-room')
      userStore.username = 'player1'
      userStore.userColor = ''
      const gridData = ['1', '0', '1']
      
      socketEmiters.emitGridUpdate(gridData)
      
      expect(mockSocket.emit).toHaveBeenCalledWith('tetris-grid', {
        room: 'game-room',
        username: 'player1',
        grid: gridData,
        color: '#FFFFFF' // Default color
      })
    })
  })
})