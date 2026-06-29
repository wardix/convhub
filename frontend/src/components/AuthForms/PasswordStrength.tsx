import styles from './PasswordStrength.module.css'

export const PasswordStrength = ({ password }: { password?: string }) => {
  if (!password) return null

  let strength = 0
  if (password.length > 7) strength += 1
  if (/[A-Z]/.test(password)) strength += 1
  if (/[0-9]/.test(password)) strength += 1
  if (/[^A-Za-z0-9]/.test(password)) strength += 1

  let label = 'Weak'
  let strengthClass = styles.weak

  if (strength >= 4) {
    label = 'Strong'
    strengthClass = styles.strong
  } else if (strength >= 2) {
    label = 'Medium'
    strengthClass = styles.medium
  }

  return (
    <div className={styles.container}>
      <div className={styles.bars}>
        <div
          className={`${styles.bar} ${strength >= 1 ? strengthClass : ''}`}
        />
        <div
          className={`${styles.bar} ${strength >= 2 ? strengthClass : ''}`}
        />
        <div
          className={`${styles.bar} ${strength >= 4 ? strengthClass : ''}`}
        />
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
