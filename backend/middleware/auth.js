const jwt = require('jsonwebtoken');
const https = require('https');
require('dotenv').config();

function supabaseQuery(path) {
  return new Promise((resolve, reject) => {
    https.get(`${process.env.SUPABASE_URL}${path}`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve([]); }
      });
    }).on('error', reject);
  });
}

async function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const users = await supabaseQuery(`/rest/v1/users?id=eq.${decoded.id}&select=id,email,name,is_admin,role,is_active`);
    const user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Cuenta desactivada.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
      role: user.role
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalido.' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };
