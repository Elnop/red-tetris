// Validation des noms d'utilisateur et de salle
export function isValidName(name: string): boolean {
  // Vérifie que le nom n'est pas vide, ne contient que des caractères alphanumériques
  // et a une longueur raisonnable (entre 1 et 20 caractères)
  return /^[a-zA-Z0-9]{1,20}$/.test(name);
}

export function validateUsername(username: string): string | null {
  if (!username || username.trim() === '') {
    return 'Le nom d\'utilisateur ne peut pas être vide';
  }
  if (!isValidName(username)) {
    return 'Le nom d\'utilisateur ne peut contenir que des lettres et des chiffres (max 20 caractères)';
  }
  return null;
}

export function validateRoomName(roomName: string): string | null {
  if (!roomName || roomName.trim() === '') {
    return 'Le nom de la salle ne peut pas être vide';
  }
  if (!isValidName(roomName)) {
    return 'Le nom de la salle ne peut contenir que des lettres et des chiffres (max 20 caractères)';
  }
  return null;
}
