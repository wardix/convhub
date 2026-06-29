const fs = require('node:fs')

const files = [
  'backend/src/routes/likes.ts',
  'backend/src/routes/comments.ts',
  'backend/src/routes/follows.ts',
  'backend/src/routes/users.ts',
]

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  content = content.replace(/await sql\.unsafe\('BEGIN'\)/g, '')
  content = content.replace(/await sql\.unsafe\('COMMIT'\)/g, '')
  content = content.replace(/await sql\.unsafe\('ROLLBACK'\)/g, '')
  fs.writeFileSync(file, content)
}
