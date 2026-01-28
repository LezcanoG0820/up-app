# Sistema de Gestión de la DGA - Universidad de Panamá

Sistema de gestión de tickets y documentos para la Dirección General de Admisión de la Universidad de Panamá.

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Requisitos Previos](#requisitos-previos)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Credenciales de Acceso](#credenciales-de-acceso)
- [Stack Tecnológico](#stack-tecnológico)
- [Solución de Problemas](#solución-de-problemas)

---

## 📖 Descripción

Sistema web para la gestión centralizada de:
- **Tickets de consultas** de estudiantes
- **Gestión de documentos** internos del departamento
- **Sistema de roles** para control de acceso
- **Notificaciones** en tiempo real
- **Historial de auditoría** de acciones

**Estado actual:** ~80% completado

---

## ⚙️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** >= 18.0.0 ([Descargar](https://nodejs.org/))
- **npm** >= 9.0.0 (incluido con Node.js)
- **Git** ([Descargar](https://git-scm.com/))
- **Visual Studio Code** (recomendado)

### Verificar instalación:
```bash
node --version   # Debe mostrar v18.x.x o superior
npm --version    # Debe mostrar 9.x.x o superior
git --version    # Debe mostrar 2.x.x o superior
```

---

## 📁 Estructura del Proyecto
```
up-app/
├── apps/
│   ├── api/                    # Backend (Express.js)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Esquema de base de datos
│   │   │   └── seed.js         # Datos iniciales
│   │   ├── routes/             # Rutas de la API
│   │   ├── middleware/         # Middlewares de autenticación
│   │   ├── .env               # Variables de entorno (CREAR ESTE ARCHIVO)
│   │   ├── index.js           # Punto de entrada del servidor
│   │   └── package.json
│   │
│   └── web/                    # Frontend (Vue 3)
│       ├── src/
│       │   ├── views/          # Vistas de la aplicación
│       │   ├── components/     # Componentes reutilizables
│       │   ├── assets/         # Recursos estáticos
│       │   ├── api.js          # Cliente API
│       │   └── main.js         # Punto de entrada
│       ├── vite.config.js      # Configuración de Vite
│       └── package.json
│
└── packages/
    └── db/
        └── data/
            └── siu.db          # Base de datos SQLite (se crea automáticamente)
```

---

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/up-app.git
cd up-app
```

### 2. Instalar dependencias del BACKEND
```bash
cd apps/api
npm install
```

**Paquetes principales que se instalarán:**
- `express` - Framework web
- `prisma` - ORM para base de datos
- `@prisma/client` - Cliente de Prisma
- `bcryptjs` - Encriptación de contraseñas
- `express-session` - Manejo de sesiones
- `cors` - Configuración CORS
- `multer` - Subida de archivos

### 3. Instalar dependencias del FRONTEND
```bash
cd ../web
npm install
```

**Paquetes principales que se instalarán:**
- `vue` - Framework frontend
- `vue-router` - Enrutamiento
- `vite` - Build tool
- `xlsx` - Manejo de archivos Excel

---

## 🔧 Configuración

### 1. Crear archivo `.env` en el backend

**Ubicación:** `apps/api/.env`
```bash
cd apps/api
touch .env
```

**Contenido del archivo `.env`:**
```env
# Ruta a la base de datos SQLite
DATABASE_URL="file:../../packages/db/data/siu.db"

# Puerto del servidor backend
PORT=4000

# Entorno de desarrollo
NODE_ENV=development
```

> ⚠️ **IMPORTANTE:** La ruta `../../packages/db/data/siu.db` es relativa a la carpeta `apps/api/prisma/`

### 2. Crear carpeta para la base de datos
```bash
# Desde la raíz del proyecto
mkdir -p packages/db/data
```

### 3. Configurar la base de datos
```bash
cd apps/api

# Generar cliente de Prisma
npx prisma generate

# Crear y aplicar migraciones
npx prisma migrate dev --name init

# Poblar la base de datos con datos iniciales
node prisma/seed.js
```

**Output esperado del seed:**
```
🌱 Iniciando seed...
✅ Departamento: Recepción
✅ Departamento: Área Administrativa
✅ Departamento: Área Técnica
✅ Departamento: Dirección
✅ Departamento: Informática
✅ Usuario: Usuario Maestro (maestro@siu.local)
✅ Usuario: Recepción (recepcion@siu.local)
...
🎉 Seed completado exitosamente
```

---

## ▶️ Ejecución

### Desarrollo local (2 terminales)

#### Terminal 1 - Backend:
```bash
cd apps/api
npm run dev
```

**Output esperado:**
```
[nodemon] starting `node index.js`
Servidor corriendo en http://localhost:4000
```

#### Terminal 2 - Frontend:
```bash
cd apps/web
npm run dev
```

**Output esperado:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Acceder a la aplicación

Abre tu navegador en: **http://localhost:5173**

---

## 🔑 Credenciales de Acceso

### Usuario Maestro (Acceso completo)
- **Email:** `maestro@siu.local`
- **Contraseña:** `Maestro#2025`
- **Permisos:** Acceso total al sistema

### Usuario Recepción
- **Email:** `recepcion@siu.local`
- **Contraseña:** `Recepcion#2025`
- **Permisos:** Gestión de tickets, recepción de estudiantes

### Usuarios de Departamento

| Departamento | Email | Contraseña |
|-------------|-------|------------|
| Administración | `admin.administracion@siu.local` | `AdminDept#2025` |
| Área Técnica | `analista.areatecnica@siu.local` | `AreaTecnica#2025` |
| Dirección | `coordinador.direccion@siu.local` | `Direccion#2025` |
| Informática | `soporte.informatica@siu.local` | `Informatica#2025` |

---

## 🛠️ Stack Tecnológico

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 5.x
- **ORM:** Prisma 6.16.2
- **Base de datos:** SQLite
- **Autenticación:** Express-session + bcryptjs
- **Validación:** Middlewares custom

### Frontend
- **Framework:** Vue 3.5+
- **Build Tool:** Vite 7.x
- **Routing:** Vue Router 4.x
- **HTTP Client:** Fetch API nativo
- **Estilos:** CSS custom con variables CSS

### Características
- ✅ Autenticación basada en sesiones
- ✅ Control de acceso basado en roles (RBAC)
- ✅ Gestión de tickets con historial de auditoría
- ✅ Sistema de notificaciones
- ✅ Subida y gestión de documentos
- ✅ Tema claro/oscuro
- ✅ Responsive design

---

## 🐛 Solución de Problemas

### Error: "database disk image is malformed"

**Causa:** Base de datos SQLite corrupta

**Solución:**
```bash
cd apps/api

# Eliminar base de datos corrupta
rm -rf ../../packages/db/data/siu.db

# Recrear desde cero
npx prisma migrate reset --force
node prisma/seed.js
```

---

### Error: "ECONNREFUSED" al hacer login

**Causa:** El backend no está corriendo

**Solución:**
```bash
# Verificar si hay algo en puerto 4000
lsof -ti:4000

# Si no hay nada, levantar el backend
cd apps/api
npm run dev
```

---

### Error: "vite: command not found"

**Causa:** Dependencias del frontend no instaladas

**Solución:**
```bash
cd apps/web
npm install
npm run dev
```

---

### Error: HTTP 500 en login

**Causa:** Cliente de Prisma desactualizado tras cambios en schema

**Solución:**
```bash
cd apps/api
npx prisma generate
# Reiniciar servidor (Ctrl+C y npm run dev)
```

---

### Base de datos vacía después de migración

**Causa:** El seed no se ejecutó automáticamente

**Solución:**
```bash
cd apps/api
node prisma/seed.js
```

---

### Error: "Invalid value for Rol"

**Causa:** Discrepancia entre el schema y la base de datos

**Solución:**
```bash
cd apps/api
rm -rf ../../packages/db/data/siu.db
npx prisma migrate dev --name reinit
node prisma/seed.js
```

---

## 📝 Comandos Útiles

### Prisma
```bash
# Generar cliente de Prisma
npx prisma generate

# Crear nueva migración
npx prisma migrate dev --name nombre_migracion

# Reset completo de base de datos
npx prisma migrate reset --force

# Ejecutar seed manualmente
node prisma/seed.js

# Abrir Prisma Studio (GUI para ver datos)
npx prisma studio
```

### Git
```bash
# Ver estado de cambios
git status

# Agregar archivos
git add .

# Hacer commit
git commit -m "descripción del cambio"

# Subir cambios
git push origin nombre-rama

# Crear nueva rama
git checkout -b nombre-nueva-rama
```

---

## 📞 Contacto y Soporte

**Desarrollador:** Guillermo Arturo Lezcano González  
**Universidad:** Universidad de Panamá  
**Proyecto:** Práctica Profesional  
**Departamento:** Dirección General de Admisión (DGA)

---

## 📄 Licencia

Este proyecto es de uso interno para la Universidad de Panamá.

---

## 🎯 Estado del Proyecto

- [x] Autenticación y autorización
- [x] Gestión de tickets
- [x] Sistema de roles (Maestro, Recepción, Departamentos, Estudiante)
- [x] Gestión de documentos
- [x] Historial de auditoría
- [ ] Sistema de notificaciones en tiempo real (80%)
- [ ] Vista previa de documentos
- [ ] Mejoras de UI/UX
- [ ] Deploy en servidor local

**Progreso general:** ~80% completado

---

## 🔄 Notas de Versión

### v3.0 (Enero 2026)
- Migración de rol `admin` → `maestro`
- Añadidos 5 nuevos departamentos
- Restructuración de la base de datos
- Mejoras en el sistema de autenticación

---

**Última actualización:** Enero 28, 2026