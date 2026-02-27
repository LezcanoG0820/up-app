// apps/api/routes/students.js
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { requireAuth, requireRole } = require('../middlewares/auth')

const prisma = new PrismaClient()
const router = express.Router()

// Buscar estudiantes por cédula/nombre/apellido/email (contains, case-insensitive)
router.get(
  '/students/search',
  requireAuth,
  requireRole('recepcion', 'maestro'),
  async (req, res) => {
    try {
      const qRaw = typeof req.query.q === 'string' ? req.query.q.trim() : ''
      if (!qRaw) return res.json({ ok: true, students: [] })

      const q = qRaw
      const students = await prisma.user.findMany({
        where: {
          rol: 'estudiante',
          OR: [
            { cedula:   { contains: q } },
            { nombre:   { contains: q } },
            { apellido: { contains: q } },
            { email:    { contains: q } },
          
          ],
        },
        orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
        select: { 
          id: true, 
          nombre: true, 
          apellido: true, 
          cedula: true, 
          email: true, 
          facultad: true,
          cru: true   
        },
      })

      res.json({ ok: true, students })
    } catch (err) {
      console.error('GET /students/search error:', err)
      res.status(500).json({ ok: false, error: 'Error buscando estudiantes' })
    }
  }
)

// Crear estudiante básico (rol=estudiante)
router.post(
  '/students',
  requireAuth,
  requireRole('recepcion', 'maestro'),
  async (req, res) => {
    try {
      const { nombre, apellido, cedula, email, facultad, cru } = req.body || {}  
      
      if (!nombre || !apellido || !cedula || !email) {
        return res.status(400).json({ ok: false, error: 'Faltan campos: nombre, apellido, cédula, email' })
      }

      // contraseña temporal simple
      const tempPassword = `Temp-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`
      const passwordHash = await bcrypt.hash(tempPassword, 10)

      const student = await prisma.user.create({
        data: {
          nombre: String(nombre),
          apellido: String(apellido),
          cedula: String(cedula),
          email: String(email).toLowerCase(),
          passwordHash,
          rol: 'estudiante',
          facultad: facultad ? String(facultad) : null,
          cru: cru ? String(cru) : null  // ⬅️ AGREGAR CRU
        },
        select: { 
          id: true, 
          nombre: true, 
          apellido: true, 
          cedula: true, 
          email: true, 
          facultad: true,
          cru: true  // 
        }
      })

      res.json({ ok: true, student, tempPassword })
    } catch (err) {
      if (err?.code === 'P2002') {
        return res.status(409).json({ ok: false, error: 'Cédula o email ya registrados' })
      }
      console.error('POST /students error:', err)
      res.status(500).json({ ok: false, error: 'Error creando estudiante' })
    }
  }
)

module.exports = router