export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): {
  valid: boolean
  message?: string
} {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    }
  }
  return { valid: true }
}

export function validateUsername(username: string): {
  valid: boolean
  message?: string
} {
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      message:
        'Username must be 3-50 characters long and contain only letters, numbers, and underscores',
    }
  }
  return { valid: true }
}
