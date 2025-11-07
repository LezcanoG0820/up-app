// apps/api/index.js
const express = require('express')
const session = require('express-session')
const cors = require('cors')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const authRoutes = require('./routes/auth')
const ticketRoutes = require('./routes/tickets')
const manageRoutes = require('./routes/manage')
const documentsRoutes = require('./routes/documents')
const studentsRoutes = require('./routes/students') // ⬅️ NUEVO

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 4000

// --------- CORS (frontend en 5173) ------------
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

// --------- JSON primero ------------------------
app.use(express.json())

app.set('trust proxy', 1)

// --------- SESIÓN ANTES DE LAS RUTAS -----------
app.use(session({
  secret: 'supersecreto-pon-un-valor-fuerte',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax'
  }
}))

// cargar usuario desde sesión
app.use(async (req, _res, next) => {
  if (req.session?.userId) {
    try {
      req.sessionUser = await prisma.user.findUnique({ where: { id: req.session.userId } })
    } catch (e) { console.error('session load error:', e) }
  }
  next()
})

// --------- ESTÁTICOS PARA SUBIDAS (docs) -------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// --------- RUTAS -------------------------------
app.get('/ping', (_req, res) => res.send('pong'))

app.get('/db-check', async (_req, res) => {
  const count = await prisma.department.count()
  res.json({ ok: true, departments: count })
})

app.use('/auth', authRoutes)
app.use('/api', manageRoutes)
app.use('/api', ticketRoutes)
if (documentsRoutes) app.use('/api/documents', documentsRoutes)
app.use('/api', studentsRoutes) 

// --------- ARRANQUE ----------------------------
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
