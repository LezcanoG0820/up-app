// apps/api/routes/documents.js
const express = require('express')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { PrismaClient } = require('@prisma/client')
const { requireAuth, requireRole } = require('../middlewares/auth')

const prisma = new PrismaClient()
const router = express.Router()

// Permisos: recepción, admin y departamentos
const canUseDocs = requireRole('admin', 'recepcion', 'departamento')

// ---- storage ----
const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    // prefijo de tiempo para evitar colisiones
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, '_')
    cb(null, `${Date.now()}__${safe}`)
  }
})

// (opcional) filtrar tipos
const allowed = new Set([
  'application/pdf',
  // Office
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',      // .xlsx
  'application/vnd.ms-excel',                                              // .xls
  'application/msword',                                                    // .doc
  // imágenes
  'image/png', 'image/jpeg',
  // texto/csv
  'text/plain', 'text/csv', 'application/csv'
])

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (allowed.size === 0 || allowed.has(file.mimetype)) return cb(null, true)
    cb(new Error('Tipo de archivo no permitido'))
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

/* =========================
   LISTAR
   ========================= */
router.get('/', requireAuth, canUseDocs, async (req, res) => {
  try {
    const { q } = req.query
    const where = q
      ? {
          OR: [
            { title: { contains: String(q), mode: 'insensitive' } },
            { originalName: { contains: String(q), mode: 'insensitive' } }
          ]
        }
      : {}

    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, filename: true, originalName: true,
        mime: true, size: true, createdAt: true, lastViewedAt: true, updatedAt: true,
        uploader: { select: { id: true, nombre: true, apellido: true } }
      }
    })
    res.json({ ok: true, documents: docs })
  } catch (e) {
    console.error('list error:', e)
    res.status(500).json({ ok: false, error: 'Error listando documentos' })
  }
})

/* =========================
   SUBIR
   ========================= */
router.post('/upload', requireAuth, canUseDocs, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'Falta archivo' })
    const title = (req.body.title || req.file.originalname).toString()

    const doc = await prisma.document.create({
      data: {
        title,
        filename: req.file.filename,
        originalName: req.file.originalname,      // 👈 requerido por el schema
        mime: req.file.mimetype,
        size: req.file.size,
        // 👇 RELACIÓN CORRECTA SEGÚN TU SCHEMA
        uploader: { connect: { id: req.sessionUser.id } }
      },
      select: {
        id: true, title: true, filename: true, originalName: true,
        mime: true, size: true, createdAt: true,
        uploader: { select: { id: true, nombre: true, apellido: true } }
      }
    })

    res.json({ ok: true, document: doc })
  } catch (e) {
    console.error('upload error:', e)
    res.status(500).json({ ok: false, error: e.message || 'Error subiendo archivo' })
  }
})

/* =========================
   MARCAR VISTO
   ========================= */
router.patch('/:id/view', requireAuth, canUseDocs, async (req, res) => {
  try {
    const id = Number(req.params.id)
    await prisma.document.update({
      where: { id },
      data: { lastViewedAt: new Date() }
    })
    res.json({ ok: true })
  } catch (e) {
    console.error('view error:', e)
    res.status(500).json({ ok: false, error: 'Error marcando visualización' })
  }
})

/* =========================
   DESCARGAR
   ========================= */
router.get('/:id/download', requireAuth, canUseDocs, async (req, res) => {
  const id = Number(req.params.id)
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return res.status(404).json({ ok: false, error: 'No existe' })

  const filepath = path.join(uploadsDir, doc.filename)
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ ok: false, error: 'Archivo no encontrado' })
  }

  const downloadName = doc.originalName || doc.filename.replace(/^\d+__/, '')
  res.download(filepath, downloadName)
})

/* =========================
   ELIMINAR
   ========================= */
router.delete('/:id', requireAuth, canUseDocs, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) return res.status(404).json({ ok: false, error: 'No existe' })

    const filepath = path.join(uploadsDir, doc.filename)
    if (fs.existsSync(filepath)) {
      try { fs.unlinkSync(filepath) } catch (_) {}
    }

    await prisma.document.delete({ where: { id } })
    res.json({ ok: true })
  } catch (e) {
    console.error('delete error:', e)
    res.status(500).json({ ok: false, error: 'Error eliminando' })
  }
})

module.exports = router
