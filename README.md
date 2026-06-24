# CATINDER - App de Matching para Empresas

Una aplicacion estilo Tinder disenada para empresas con menos de 1000 empleados, permitiendo crear conexiones significativas entre companeros de trabajo.

## Caracteristicas

- **Perfiles de Usuarios**: Foto, nombre, departamento, puesto, bio e intereses
- **Sistema de Swipe**: Like/Nope para descubrir compañeros
- **Matching**: Cuando ambos se gustan, se crea un match automatico
- **Chat en Tiempo Real**: Mensajeria instantanea con WebSocket
- **Panel de Administracion**: Gestion de usuarios, estadisticas y configuracion
- **Sistema de Matching**: Por departamentos e intereses

## Tecnologias

### Backend
- Node.js + Express
- SQLite (base de datos ligera)
- Socket.IO (chat en tiempo real)
- JWT (autenticacion)
- bcryptjs (encriptacion)

### Frontend
- React 18
- React Router
- Socket.IO Client
- Axios

## Instalacion

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Ejecucion

### 1. Iniciar Backend

```bash
cd backend
npm run dev
```

El servidor estara disponible en http://localhost:3001

### 2. Poblar Base de Datos (Opcional)

```bash
cd backend
node seed.js
```

Esto creara usuarios de prueba para probar la aplicacion.

### 3. Iniciar Frontend

```bash
cd frontend
npm run dev
```

La aplicacion estara disponible en http://localhost:5173

## Credenciales de Prueba

| Email | Password | Rol |
|-------|----------|-----|
| admin@empresa.com | admin123 | Administrador |
| maria@empresa.com | maria123 | Usuario |
| juan@empresa.com | juan123 | Usuario |
| ana@empresa.com | ana123 | Usuario |

## Estructura del Proyecto

```
CATINDER/
├── backend/
│   ├── routes/
│   │   ├── auth.js        # Rutas de autenticacion
│   │   ├── users.js       # Rutas de usuarios y swipe
│   │   ├── matches.js     # Rutas de matches y chat
│   │   └── admin.js       # Rutas de administracion
│   ├── middleware/
│   │   └── auth.js        # Middleware de autenticacion
│   ├── database.js        # Configuracion de SQLite
│   ├── server.js          # Servidor principal
│   ├── seed.js            # Script de datos de prueba
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DiscoverPage.jsx
│   │   │   ├── MatchesPage.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## Funcionalidades por Rol

### Usuario Regular
- Crear y editar perfil
- Descubrir compañeros (swipe)
- Ver matches
- Enviar mensajes
- Ver y editar perfil

### Administrador
- Todo lo del usuario regular
- Ver estadisticas de la plataforma
- Gestionar usuarios (activar/desactivar)
- Asignar/quitar permisos de admin
- Eliminar usuarios

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesion

### Users
- `GET /api/users/profile` - Obtener perfil
- `PUT /api/users/profile` - Actualizar perfil
- `GET /api/users/discover` - Descubrir perfiles
- `POST /api/users/swipe/:direction/:userId` - Hacer swipe

### Matches
- `GET /api/matches` - Obtener matches
- `GET /api/matches/:id/messages` - Obtener mensajes
- `POST /api/matches/:id/messages` - Enviar mensaje

### Admin
- `GET /api/admin/stats` - Estadisticas
- `GET /api/admin/users` - Lista de usuarios
- `PUT /api/admin/users/:id/toggle-status` - Activar/desactivar
- `PUT /api/admin/users/:id/toggle-admin` - Cambiar rol admin
- `DELETE /api/admin/users/:id` - Eliminar usuario

## Notas

- La app usa SQLite como base de datos, ideal para empresas pequenas
- El chat funciona en tiempo real usando WebSocket
- Los mensajes se guardan en la base de datos
- La autenticacion usa JWT con expiracion de 7 dias
