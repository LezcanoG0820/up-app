// apps/api/index.js
const express = require('express')
const session = require('express-session')
const cors = require('cors')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const authRoutes = require('./routes/auth')
const ticketRoutes = require('./routes/tickets')
const manageRoutes = require('./routes/manage')
let documentsRoutes = null
try {
  documentsRoutes = require('./routes/documents')
} catch (e) {
  console.warn('[WARN] ./routes/documents no encontrado aún. Se podrá añadir luego.')
}

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 4000

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())
app.set('trust proxy', 1)

app.use(session({
  secret: 'supersecreto-pon-un-valor-fuerte',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}))

app.use(async (req, _res, next) => {
  if (req.session?.userId) {
    try {
      req.sessionUser = await prisma.user.findUnique({ where: { id: req.session.userId } })
    } catch (e) { console.error('session load error:', e) }
  }
  next()
})

// servir uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/ping', (_req, res) => res.send('pong'))
app.get('/db-check', async (_req, res) => {
  const count = await prisma.department.count()
  res.json({ ok: true, departments: count })
})

app.use('/auth', authRoutes)
app.use('/api', manageRoutes)
app.use('/api', ticketRoutes)
if (documentsRoutes) {
  app.use('/api/documents', documentsRoutes)
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
