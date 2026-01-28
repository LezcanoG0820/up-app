// apps/api/routes/documents.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middlewares/auth');

const path = require('path');
const fs = require('fs');
const multer = require('multer');

const prisma = new PrismaClient();
const router = express.Router();

/* ========================
   Configuración de subida
   ======================== */

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'docs');

// Asegurar que exista la carpeta de uploads
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = base.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const ts = Date.now();
    cb(null, `${ts}_${safeBase}${ext}`);
  }
});

const upload = multer({ storage });

/* ========================
   Helpers
   ======================== */

function buildWhereForList(user, query) {
  const { departmentId, scope } = query || {};
  const where = {};

  // Filtro por departamento explícito si viene por query
  if (departmentId) {
    where.departmentId = Number(departmentId);
  } else if (user.rol === 'departamento' && user.departamentoId) {
    // Por defecto, un usuario de departamento ve su propio departamento
    where.departmentId = user.departamentoId;
  }

  // Filtro de "solo mis documentos"
  if (scope === 'mine') {
    where.uploaderId = user.id;
  }

  return where;
}

function docToJson(doc) {
  return {
    id: doc.id,
    title: doc.title,
    filename: doc.filename,
    originalName: doc.originalName,
    mime: doc.mime,
    size: doc.size,
    departmentId: doc.departmentId,
    departmentNombre: doc.department ? doc.department.nombre : null,
    uploaderId: doc.uploaderId,
    uploaderNombre: doc.uploader
      ? `${doc.uploader.nombre} ${doc.uploader.apellido}`.trim()
      : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastViewedAt: doc.lastViewedAt,
    lastEditedAt: doc.lastEditedAt
  };
}

/* ========================
   Listar documentos
   ======================== */

router.get(
  '/documents',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
  async (req, res) => {
    try {
      const where = buildWhereForList(req.sessionUser, req.query);

      const docs = await prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: { select: { nombre: true, apellido: true } },
          department: { select: { id: true, nombre: true } }
        }
      });

      res.json({
        ok: true,
        documents: docs.map(docToJson)
      });
    } catch (err) {
      console.error('GET /api/documents error:', err);
      res.status(500).json({ ok: false, error: 'Error listando documentos' });
    }
  }
);

/* ========================
   Subir documento
   ======================== */

router.post(
  '/documents/upload',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
  upload.single('file'),
  async (req, res) => {
    try {
      const file = req.file;
      const { title, departmentId } = req.body || {};

      if (!file) {
        return res.status(400).json({ ok: false, error: 'Falta archivo' });
      }

      // Departamento asociado:
      // - si viene como parámetro, se usa ese
      // - si el usuario es de "departamento", se usa su propio depto
      // - maestro/recepción pueden dejarlo vacío (null) si así lo desean
      let deptId = null;
      if (departmentId) {
        deptId = Number(departmentId);
      } else if (req.sessionUser.departamentoId) {
        deptId = req.sessionUser.departamentoId;
      }

      const doc = await prisma.document.create({
        data: {
          title: title && String(title).trim().length
            ? String(title).trim()
            : file.originalname,
          filename: file.filename,
          originalName: file.originalname,
          mime: file.mimetype,
          size: file.size,
          uploaderId: req.sessionUser.id,
          departmentId: deptId
        },
        include: {
          uploader: { select: { nombre: true, apellido: true } },
          department: { select: { id: true, nombre: true } }
        }
      });

      res.json({ ok: true, document: docToJson(doc) });
    } catch (err) {
      console.error('POST /api/documents/upload error:', err);
      res.status(500).json({ ok: false, error: 'Error subiendo documento' });
    }
  }
);

/* ========================
   Marcar como visto
   ======================== */

router.patch(
  '/documents/:id/view',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const doc = await prisma.document.update({
        where: { id },
        data: { lastViewedAt: new Date() },
        include: {
          uploader: { select: { nombre: true, apellido: true } },
          department: { select: { id: true, nombre: true } }
        }
      });

      res.json({ ok: true, document: docToJson(doc) });
    } catch (err) {
      console.error('PATCH /api/documents/:id/view error:', err);
      res.status(500).json({ ok: false, error: 'Error marcando como visto' });
    }
  }
);

/* ========================
   Descargar documento
   ======================== */

router.get(
  '/documents/:id/download',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const doc = await prisma.document.findUnique({ where: { id } });

      if (!doc) {
        return res.status(404).json({ ok: false, error: 'No existe' });
      }

      const filepath = path.join(UPLOAD_DIR, doc.filename);

      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ ok: false, error: 'Archivo no encontrado en el servidor' });
      }

      res.download(filepath, doc.originalName || doc.filename);
    } catch (err) {
      console.error('GET /api/documents/:id/download error:', err);
      res.status(500).json({ ok: false, error: 'Error descargando documento' });
    }
  }
);

/* ========================
   Renombrar documento
   ======================== */

router.patch(
  '/documents/:id',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title } = req.body || {};

      if (!title || !String(title).trim().length) {
        return res.status(400).json({ ok: false, error: 'Título requerido' });
      }

      const doc = await prisma.document.update({
        where: { id },
        data: {
          title: String(title).trim(),
          lastEditedAt: new Date()
        },
        include: {
          uploader: { select: { nombre: true, apellido: true } },
          department: { select: { id: true, nombre: true } }
        }
      });

      res.json({ ok: true, document: docToJson(doc) });
    } catch (err) {
      console.error('PATCH /api/documents/:id error:', err);
      res.status(500).json({ ok: false, error: 'Error renombrando documento' });
    }
  }
);

/* ========================
   Eliminar documento
   ======================== */

router.delete(
  '/documents/:id',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) {
        return res.status(404).json({ ok: false, error: 'No existe' });
      }

      const filepath = path.join(UPLOAD_DIR, doc.filename);

      await prisma.document.delete({ where: { id } });

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('DELETE /api/documents/:id error:', err);
      res.status(500).json({ ok: false, error: 'Error eliminando documento' });
    }
  }
);

module.exports = router;