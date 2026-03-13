# Sistema de Gestión de la DGA

# Sistema de Gestión de la DGA

🌐 Language / Idioma

- 🇺🇸 English (current)
- 🇪🇸 [Español](README.es.md)

  
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)
![Status](https://img.shields.io/badge/status-active-success)

Internal Ticket Management System for the\
**Dirección General de Admisión -- Universidad de Panamá**

Sistema interno de gestión de tickets para la\
**Dirección General de Admisión de la Universidad de Panamá**.

------------------------------------------------------------------------

# Table of Contents

-   System Architecture
-   Tech Stack
-   Features
-   Installation
-   Database Setup
-   Running the Application
-   Access the Application
-   Troubleshooting
-   Default Admin Creation
-   Production Deployment
-   Project Structure
-   Support
-   License
-   Author

------------------------------------------------------------------------

# System Architecture

``` mermaid
graph TD
A[Vue Frontend :5173] --> B[Node.js Express API :4000]
B --> C[(PostgreSQL Database)]
```

------------------------------------------------------------------------

# Tech Stack

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

## Database

-   PostgreSQL

------------------------------------------------------------------------

# Features

-   Ticket creation and management
-   Internal communication system
-   User role management
-   Real-time updates using WebSockets
-   Secure authentication
-   Admin dashboard
-   PostgreSQL persistent storage

------------------------------------------------------------------------

# Installation

## Clone the Repository

``` bash
git clone https://github.com/LezcanoG0820/up-app.git
cd up-app
```

------------------------------------------------------------------------

# Backend Installation

``` bash
cd apps/api
npm install
```

Important packages installed:

-   express -- Web framework
-   prisma -- Database ORM
-   @prisma/client -- Prisma client
-   bcryptjs -- Password hashing
-   express-session -- Session management
-   ws -- WebSocket support
-   cors -- Cross-origin resource sharing

------------------------------------------------------------------------

# Frontend Installation

``` bash
cd apps/web
npm install
```

Important packages installed:

-   vue -- Frontend framework
-   vue-router -- Routing
-   vite -- Build tool

------------------------------------------------------------------------

# Database Setup

Create PostgreSQL database:

``` sql
CREATE DATABASE dga_tickets;
```

Create `.env` file inside `apps/api`:

    DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/dga_tickets"
    SESSION_SECRET="your-super-secret-key-change-this-in-production"
    PORT=4000

Replace:

-   USERNAME → PostgreSQL username
-   PASSWORD → PostgreSQL password

Example:

    DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/dga_tickets"

Run migrations:

``` bash
cd apps/api

npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

Verify database:

``` bash
npx prisma studio
```

------------------------------------------------------------------------

# Running the Application

## Start Backend

``` bash
cd apps/api
npm run dev
```

## Start Frontend

``` bash
cd apps/web
npm run dev
```

------------------------------------------------------------------------

# Access the Application

Open in browser:

    http://localhost:5173

------------------------------------------------------------------------

# Troubleshooting

## Cannot Connect to Database

Verify PostgreSQL is running.

Test connection:

``` bash
psql -U postgres -d dga_tickets
```

------------------------------------------------------------------------

## Port 4000 Already in Use

### Windows

``` bash
netstat -ano | findstr :4000
taskkill /PID <PID_NUMBER> /F
```

### macOS / Linux

``` bash
lsof -ti:4000 | xargs kill -9
```

Or change port in `.env`:

    PORT=4001

------------------------------------------------------------------------

## Module Not Found Errors

    cd apps/api
    rm -rf node_modules package-lock.json
    npm install

    cd ../web
    rm -rf node_modules package-lock.json
    npm install

------------------------------------------------------------------------

# Default Admin Creation

Open Prisma Studio:

``` bash
cd apps/api
npx prisma studio
```

Create a user in **User table**:

  Field      Value
  ---------- --------------------
  nombre     Admin
  apellido   Sistema
  cedula     0-000-0000
  email      admin@dga.up.ac.pa
  rol        maestro

Generate password hash:

``` bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

------------------------------------------------------------------------

# Production Deployment Notes

Before deploying to production:

-   Change SESSION_SECRET
-   Use environment variables
-   Enable HTTPS
-   Configure PostgreSQL remote access if required
-   Set production mode

``` bash
NODE_ENV=production
```

------------------------------------------------------------------------

# Project Structure

    up-app
    │
    ├── apps
    │   ├── api        # Backend (Node.js + Express)
    │   └── web        # Frontend (Vue + Vite)
    │
    ├── prisma         # Database schema
    │
    ├── docs           # Documentation & screenshots
    │
    └── README.md

------------------------------------------------------------------------

# Support

For issues or questions:

-   Contact the development team
-   Review the user manual

------------------------------------------------------------------------

# License

Developed for:

**Universidad de Panamá**\
Dirección General de Admisión

------------------------------------------------------------------------

# Author

**Guillermo Lezcano**\
Universidad Tecnológica de Panamá\
2026
