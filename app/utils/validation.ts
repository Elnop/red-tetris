// Validation of username and room names
export function isValidName(name: string): boolean {
  // Checks that the name is not empty, contains only alphanumeric characters
  // and has a reasonable length (between 1 and 20 characters)
  return /^[a-zA-Z0-9]{1,20}$/.test(name);
}

export function validateUsername(username: string): string | null {
  if (!username || username.trim() === '') {
    return 'Username cannot be empty';
  }
  if (!isValidName(username)) {
    return 'Username can only contain letters and numbers (max 20 characters)';
  }
  return null;
}

export function validateRoomName(roomName: string): string | null {
  if (!roomName || roomName.trim() === '') {
    return 'Room name cannot be empty';
  }
  if (!isValidName(roomName)) {
    return 'Room name can only contain letters and numbers (max 20 characters)';
  }
  return null;
}
