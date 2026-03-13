# Sistema de Gestión de la DGA

🌐 Idioma / Language

-   🇪🇸 Español (actual)
-   🇺🇸 [English](README.md)

------------------------------------------------------------------------

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)
![Estado](https://img.shields.io/badge/estado-activo-success)

Sistema interno de gestión de tickets para la\
**Dirección General de Admisión -- Universidad de Panamá**.

------------------------------------------------------------------------

# Índice

-   Arquitectura del Sistema
-   Tecnologías Utilizadas
-   Características
-   Instalación
-   Configuración de Base de Datos
-   Ejecución de la Aplicación
-   Acceso al Sistema
-   Solución de Problemas
-   Creación de Usuario Administrador
-   Despliegue en Producción
-   Estructura del Proyecto
-   Soporte
-   Licencia
-   Autor

------------------------------------------------------------------------

# Arquitectura del Sistema

``` mermaid
graph TD
A[Frontend Vue :5173] --> B[API Node.js Express :4000]
B --> C[(Base de Datos PostgreSQL)]
```

------------------------------------------------------------------------

# Tecnologías Utilizadas

## Backend

-   Node.js
-   Express
-   Prisma ORM
-   PostgreSQL
-   WebSockets
-   express-session
-   bcryptjs

## Frontend

-   Vue 3
-   Vue Router
-   Vite

## Base de Datos

-   PostgreSQL

------------------------------------------------------------------------

# Características

-   Creación y gestión de tickets
-   Sistema de comunicación interna
-   Gestión de roles de usuario
-   Actualizaciones en tiempo real con WebSockets
-   Autenticación segura
-   Panel de administración
-   Almacenamiento persistente en PostgreSQL

------------------------------------------------------------------------

# Instalación

## Clonar el repositorio

``` bash
git clone https://github.com/LezcanoG0820/up-app.git
cd up-app
```

------------------------------------------------------------------------

# Instalación del Backend

``` bash
cd apps/api
npm install
```

Paquetes principales:

-   express -- Framework web
-   prisma -- ORM de base de datos
-   @prisma/client -- Cliente Prisma
-   bcryptjs -- Hash de contraseñas
-   express-session -- Gestión de sesiones
-   ws -- WebSockets
-   cors -- Control de acceso entre dominios

------------------------------------------------------------------------

# Instalación del Frontend

``` bash
cd apps/web
npm install
```

Paquetes principales:

-   vue -- Framework frontend
-   vue-router -- Enrutamiento
-   vite -- Herramienta de desarrollo

------------------------------------------------------------------------

# Configuración de Base de Datos

Crear base de datos:

``` sql
CREATE DATABASE dga_tickets;
```

Crear archivo `.env` dentro de `apps/api`:

    DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@localhost:5432/dga_tickets"
    SESSION_SECRET="clave-super-secreta"
    PORT=4000

Ejemplo:

    DATABASE_URL="postgresql://postgres:micontraseña@localhost:5432/dga_tickets"

Ejecutar migraciones:

``` bash
cd apps/api

npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

Verificar base de datos:

``` bash
npx prisma studio
```

------------------------------------------------------------------------

# Ejecutar la Aplicación

## Backend

``` bash
cd apps/api
npm run dev
```

## Frontend

``` bash
cd apps/web
npm run dev
```

------------------------------------------------------------------------

# Acceder a la Aplicación

Abrir en el navegador:

    http://localhost:5173

------------------------------------------------------------------------

# Solución de Problemas

## No se puede conectar a la base de datos

Verificar que PostgreSQL esté ejecutándose.

Probar conexión:

``` bash
psql -U postgres -d dga_tickets
```

------------------------------------------------------------------------

## Puerto 4000 en uso

### Windows

``` bash
netstat -ano | findstr :4000
taskkill /PID <PID_NUMERO> /F
```

### macOS / Linux

``` bash
lsof -ti:4000 | xargs kill -9
```

O cambiar puerto en `.env`:

    PORT=4001

------------------------------------------------------------------------

# Creación de Usuario Administrador

Abrir Prisma Studio:

``` bash
cd apps/api
npx prisma studio
```

Crear registro en la tabla **User**:

  Campo      Valor
  ---------- --------------------
  nombre     Admin
  apellido   Sistema
  cedula     0-000-0000
  email      admin@dga.up.ac.pa
  rol        maestro

Generar hash de contraseña:

``` bash
node -e "console.log(require('bcryptjs').hashSync('tu-contraseña', 10))"
```

------------------------------------------------------------------------

# Despliegue en Producción

Antes de desplegar:

-   Cambiar `SESSION_SECRET`
-   Usar variables de entorno
-   Habilitar HTTPS
-   Configurar acceso remoto a PostgreSQL si es necesario
-   Establecer modo producción

``` bash
NODE_ENV=production
```

------------------------------------------------------------------------

# Estructura del Proyecto

    up-app
    │
    ├── apps
    │   ├── api        # Backend (Node.js + Express)
    │   └── web        # Frontend (Vue + Vite)
    │
    ├── prisma         # Esquema de base de datos
    │
    ├── docs           # Documentación y capturas
    │
    ├── README.md
    ├── README.es.md

------------------------------------------------------------------------

# Soporte

Para preguntas o problemas:

-   Contactar al equipo de desarrollo
-   Revisar el manual de usuario

------------------------------------------------------------------------

# Licencia

Desarrollado para:

**Universidad de Panamá**\
Dirección General de Admisión

------------------------------------------------------------------------

# Autor

**Guillermo Lezcano**\
Universidad Tecnológica de Panamá\
2026
