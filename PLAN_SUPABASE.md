# Plan: Migracion de CATINDER a Supabase

## Resumen
Migrar el backend de CATINDER de SQLite a Supabase para:
- Base de datos PostgreSQL con paginacion
- Supabase Auth para autenticacion
- Supabase Storage para imagenes de perfil (max 5MB)
- Paginacion de 50 perfiles por pagina en Discover

---

## Fase 1: Configuracion Inicial de Supabase

### 1.1 Crear cuenta y proyecto
1. Ir a https://supabase.com y crear cuenta gratuita
2. Crear nuevo proyecto:
   - Nombre: `catinder`
   - Database password: (guardar)
   - Region: `South America` (mas cercana)

### 1.2 Obtener credenciales
- `SUPABASE_URL`: https://xxxxx.supabase.co
- `SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIs...
- `SUPABASE_SERVICE_ROLE_KEY`: eyJhbGciOiJIUzI1NiIs...

### 1.3 Instalar dependencias
```bash
cd backend
npm install @supabase/supabase-js
```

---

## Fase 2: Crear Tablas en Supabase

Ejecutar en SQL Editor de Supabase:

```sql
-- Tabla users (migrada de SQLite)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  corporate_email TEXT,
  employee_id TEXT UNIQUE,
  name TEXT NOT NULL,
  age INTEGER,
  
  -- Call center fields
  campaign TEXT NOT NULL,
  shift TEXT NOT NULL CHECK(shift IN ('manana','tarde','noche','madrugada')),
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  
  -- Location
  building TEXT,
  floor TEXT,
  
  -- Role
  role TEXT NOT NULL DEFAULT 'agente' CHECK(role IN ('agente','supervisor','calidad','rrhh','admin_sistema')),
  
  -- Profile
  department TEXT,
  position TEXT,
  bio TEXT,
  interests TEXT,
  photo TEXT,
  looking_for TEXT DEFAULT 'both',
  
  -- Break Match
  is_on_break BOOLEAN DEFAULT FALSE,
  break_start_time TIMESTAMPTZ,
  
  -- Privacy
  hide_from_bosses BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla swipes
CREATE TABLE swipes (
  id BIGSERIAL PRIMARY KEY,
  swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK(direction IN ('like','nope')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

-- Tabla matches
CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_break_match BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Tabla messages
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla break_requests
CREATE TABLE break_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indices para performance
CREATE INDEX idx_users_shift ON users(shift);
CREATE INDEX idx_users_campaign ON users(campaign);
CREATE INDEX idx_users_building ON users(building);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_break_requests_user ON break_requests(user_id);
CREATE INDEX idx_break_requests_available ON break_requests(is_available, expires_at);

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_requests ENABLE ROW LEVEL SECURITY;

-- Politicas basicas (se ajustaran con auth)
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
```

---

## Fase 3: Configurar Storage para Imagenes

### 3.1 Crear Bucket
En Supabase Dashboard > Storage:
1. Crear bucket: `profile-photos`
2. Configurar:
   - Public: **No** (usar signed URLs)
   - File size limit: **5MB**
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

### 3.2 Politicas de Storage
```sql
-- Politica para subir fotos
CREATE POLICY "Users can upload own photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Politica para ver fotos
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Politica para eliminar fotos
CREATE POLICY "Users can delete own photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Fase 4: Migrar Backend

### 4.1 Crear archivo `supabase.js`
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
```

### 4.2 Migrar `routes/auth.js`
- Usar `supabase.auth.signUp()` para registro
- Usar `supabase.auth.signInWithPassword()` para login
- Eliminar bcrypt (Supabase maneja el hashing)
- Mantener JWT propio o usar el de Supabase

### 4.3 Migrar `routes/users.js`
- Reemplazar SQL queries con `supabase.from('users').select()`
- Implementar paginacion con `.range(start, end)`
- Usar Supabase Storage para fotos:
  ```javascript
  // Subir foto
  const { data, error } = await supabase.storage
    .from('profile-photos')
    .upload(`${userId}/photo.jpg`, file);
  
  // Obtener URL firmada
  const { data: urlData } = await supabase.storage
    .from('profile-photos')
    .createSignedUrl(`${userId}/photo.jpg`, 3600);
  ```

### 4.4 Migrar `routes/matches.js`
- Reemplazar JOINs con queries de Supabase
- Usar `.select('*, user1:users!user1_id(*), user2:users!user2_id(*)')`

### 4.5 Migrar `routes/admin.js`
- Reemplazar SQL con queries de Supabase
- Mantener las mismas funcionalidades

### 4.6 Eliminar archivos obsoletos
- `database.js` (configuracion SQLite)
- `db.js` (wrapper SQLite)
- `seed.js` (datos de prueba - reemplazar con SQL de Supabase)

---

## Fase 5: Paginacion en Discover

### 5.1 Backend - Endpoint paginado
```javascript
router.get('/discover', authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  
  // Obtener IDs ya swipados
  const { data: swiped } = await supabase
    .from('swipes')
    .select('swiped_id')
    .eq('swiper_id', req.user.id);
  
  const swipedIds = swiped.map(s => s.swiped_id);
  
  // Query con filtros y paginacion
  let query = supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .neq('id', req.user.id)
    .not('id', 'in', `(${swipedIds.join(',')})`)
    .range(offset, offset + limit - 1);
  
  // Aplicar filtros opcionales
  if (req.query.same_shift === 'true') {
    query = query.eq('shift', currentUser.shift);
  }
  // ... mas filtros
  
  const { data, error } = await query;
  
  // Contar total para paginacion
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  res.json({
    profiles: data,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    }
  });
});
```

### 5.2 Frontend - Infinite Scroll
```javascript
// Hook personalizado para paginacion
const useInfiniteScroll = () => {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const loadMore = () => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  };
  
  return { page, loadMore, setHasMore };
};
```

---

## Fase 6: Variables de Entorno

### `backend/.env`
```
PORT=3001
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=catinder_super_secret_key_2024
ALLOWED_DOMAINS=callcenter.com,empresa.com
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `backend/package.json` | Agregar `@supabase/supabase-js` |
| `backend/.env` | Agregar credenciales Supabase |
| `backend/supabase.js` | **NUEVO** - Cliente Supabase |
| `backend/routes/auth.js` | Migrar a Supabase Auth |
| `backend/routes/users.js` | Migrar queries + paginacion + Storage |
| `backend/routes/matches.js` | Migrar queries |
| `backend/routes/admin.js` | Migrar queries |
| `backend/middleware/auth.js` | Adaptar para Supabase Auth |
| `backend/database.js` | **ELIMINAR** |
| `backend/db.js` | **ELIMINAR** |
| `backend/seed.js` | **ELIMINAR** o reemplazar |
| `frontend/src/services/api.js` | Agregar pagination params |

---

## Orden de Ejecucion

1. Crear cuenta Supabase y proyecto
2. Ejecutar SQL de tablas en Supabase
3. Crear bucket de Storage
4. Instalar dependencias
5. Crear `supabase.js`
6. Migrar auth routes
7. Migrar users routes (con paginacion)
8. Migrar matches routes
9. Migrar admin routes
10. Actualizar frontend para paginacion
11. Probar todo
12. Eliminar archivos SQLite

---

## Notas Importantes

- **Supabase Free Tier**: 500MB database, 1GB storage, 50,000 usuarios activos/mes
- **Paginacion**: 50 perfiles por pagina es ideal para mobile
- **RLS**: Row Level Security protege los datos automaticamente
- **Storage**: Las URLs firmadas expiran en 1 hora, se renuevan automaticamente
- **Auth**: Supabase maneja el hashing de passwords internamente
