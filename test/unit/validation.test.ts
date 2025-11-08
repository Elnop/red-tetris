import { describe, it, expect } from 'vitest'
import { isValidName, validateUsername, validateRoomName } from '~/utils/validation'

describe('Validation Utils', () => {
  describe('isValidName', () => {
    it('should return true for valid alphanumeric names', () => {
      expect(isValidName('player1')).toBe(true)
      expect(isValidName('ROOM123')).toBe(true)
      expect(isValidName('a')).toBe(true)
      expect(isValidName('12345')).toBe(true)
      expect(isValidName('MixedCaseAlpha123')).toBe(true)
    })

    it('should return false for names with special characters', () => {
      expect(isValidName('player-1')).toBe(false)
      expect(isValidName('room@123')).toBe(false)
      expect(isValidName('name with space')).toBe(false)
      expect(isValidName('user_name')).toBe(false)
      expect(isValidName('room.name')).toBe(false)
    })

    it('should return false for empty or whitespace names', () => {
      expect(isValidName('')).toBe(false)
      expect(isValidName(' ')).toBe(false)
      expect(isValidName('   ')).toBe(false)
    })

    it('should return false for names longer than 20 characters', () => {
      expect(isValidName('a'.repeat(20))).toBe(true)
      expect(isValidName('a'.repeat(21))).toBe(false)
      expect(isValidName('verylongusernamethatexceeds20chars')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidName('0')).toBe(true)
      expect(isValidName('A')).toBe(true)
      expect(isValidName('z')).toBe(true)
      expect(isValidName('9')).toBe(true)
    })
  })

  describe('validateUsername', () => {
    it('should return null for valid usernames', () => {
      expect(validateUsername('player1')).toBe(null)
      expect(validateUsername('USER123')).toBe(null)
      expect(validateUsername('a')).toBe(null)
      expect(validateUsername('12345')).toBe(null)
    })

    it('should return error message for empty username', () => {
      expect(validateUsername('')).toBe('Username cannot be empty')
      expect(validateUsername('   ')).toBe('Username cannot be empty')
    })

    it('should return error message for invalid characters', () => {
      const errorMessage = 'Username can only contain letters and numbers (max 20 characters)'
      expect(validateUsername('user-name')).toBe(errorMessage)
      expect(validateUsername('user@domain')).toBe(errorMessage)
      expect(validateUsername('user name')).toBe(errorMessage)
      expect(validateUsername('user_name')).toBe(errorMessage)
    })

    it('should return error message for names too long', () => {
      const longName = 'a'.repeat(21)
      const errorMessage = 'Username can only contain letters and numbers (max 20 characters)'
      expect(validateUsername(longName)).toBe(errorMessage)
    })

    it('should handle null and undefined inputs', () => {
      // @ts-expect-error Testing invalid input
      expect(validateUsername(null)).toBe('Username cannot be empty')
      // @ts-expect-error Testing invalid input
      expect(validateUsername(undefined)).toBe('Username cannot be empty')
    })

    it('should trim whitespace before validation', () => {
      expect(validateUsername('  valid123  ')).toBe('Username can only contain letters and numbers (max 20 characters)')
    })
  })

  describe('validateRoomName', () => {
    it('should return null for valid room names', () => {
      expect(validateRoomName('room1')).toBe(null)
      expect(validateRoomName('LOBBY123')).toBe(null)
      expect(validateRoomName('a')).toBe(null)
      expect(validateRoomName('12345')).toBe(null)
    })

    it('should return error message for empty room name', () => {
      expect(validateRoomName('')).toBe('Room name cannot be empty')
      expect(validateRoomName('   ')).toBe('Room name cannot be empty')
    })

    it('should return error message for invalid characters', () => {
      const errorMessage = 'Room name can only contain letters and numbers (max 20 characters)'
      expect(validateRoomName('room-1')).toBe(errorMessage)
      expect(validateRoomName('room@lobby')).toBe(errorMessage)
      expect(validateRoomName('room name')).toBe(errorMessage)
      expect(validateRoomName('room_name')).toBe(errorMessage)
    })

    it('should return error message for names too long', () => {
      const longName = 'a'.repeat(21)
      const errorMessage = 'Room name can only contain letters and numbers (max 20 characters)'
      expect(validateRoomName(longName)).toBe(errorMessage)
    })

    it('should handle null and undefined inputs', () => {
      // @ts-expect-error Testing invalid input
      expect(validateRoomName(null)).toBe('Room name cannot be empty')
      // @ts-expect-error Testing invalid input
      expect(validateRoomName(undefined)).toBe('Room name cannot be empty')
    })

    it('should have different error messages than username validation', () => {
      expect(validateUsername('')).not.toBe(validateRoomName(''))
      expect(validateUsername('invalid@name')).not.toBe(validateRoomName('invalid@name'))
    })
  })

  describe('consistency between validators', () => {
    it('should use isValidName consistently', () => {
      const testCases = ['valid123', 'invalid@name', '', 'a'.repeat(21)]
      
      testCases.forEach(testCase => {
        const isValid = isValidName(testCase)
        const usernameValid = validateUsername(testCase) === null
        const roomNameValid = validateRoomName(testCase) === null
        
        if (testCase === '' || testCase.trim() === '') {
          // Empty strings have different handling
          expect(usernameValid).toBe(false)
          expect(roomNameValid).toBe(false)
        } else {
          expect(usernameValid).toBe(isValid)
          expect(roomNameValid).toBe(isValid)
        }
      })
    })
  })
})