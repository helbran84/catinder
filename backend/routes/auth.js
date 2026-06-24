const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '').split(',');

function isValidCorporateEmail(email) {
  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}

function supabaseHeaders() {
  return {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };
}

async function supabaseQuery(path) {
  const https = require('https');
  const url = `${process.env.SUPABASE_URL}${path}`;
  return new Promise((resolve, reject) => {
    https.get(url, { headers: supabaseHeaders() }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve([]); }
      });
    }).on('error', reject);
  });
}

router.post('/register', async (req, res) => {
  try {
    const {
      email, password, name, age,
      campaign, shift, shift_start, shift_end,
      building, floor, role, position, bio, interests
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password y nombre son requeridos.' });
    }

    if (!campaign) {
      return res.status(400).json({ error: 'La campana es obligatoria.' });
    }

    if (!shift || !shift_start || !shift_end) {
      return res.status(400).json({ error: 'El turno y horario son obligatorios.' });
    }

    if (!isValidCorporateEmail(email)) {
      return res.status(400).json({ error: 'Debes usar un email corporativo valido.' });
    }

    const existingUsers = await supabaseQuery(`/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'El email ya esta registrado.' });
    }

    const https = require('https');
    const authBody = JSON.stringify({ email, password, email_confirm: true });
    const authData = await new Promise((resolve, reject) => {
      const req2 = https.request(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { ...supabaseHeaders(), 'Content-Length': Buffer.byteLength(authBody) }
      }, (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => resolve(JSON.parse(d)));
      });
      req2.write(authBody);
      req2.end();
    });

    if (authData.code) {
      return res.status(400).json({ error: 'Error al crear usuario: ' + authData.msg });
    }

    const userId = authData.id;

    const profileBody = JSON.stringify({
      id: userId,
      email,
      name,
      age: age || null,
      campaign,
      shift,
      shift_start,
      shift_end,
      building: building || null,
      floor: floor || null,
      role: role || 'agente',
      position: position || null,
      bio: bio || null,
      interests: interests || null,
      is_active: true,
      is_admin: false
    });

    await new Promise((resolve, reject) => {
      const req3 = https.request(`${process.env.SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: { ...supabaseHeaders(), 'Content-Length': Buffer.byteLength(profileBody), 'Prefer': 'return=minimal' }
      }, (res3) => {
        let d = '';
        res3.on('data', c => d += c);
        res3.on('end', () => resolve(d));
      });
      req3.write(profileBody);
      req3.end();
    });

    const token = jwt.sign(
      { id: userId, email, is_admin: false, role: role || 'agente' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: userId, email, name, campaign, shift, role: role || 'agente', is_admin: false }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos.' });
    }

    const https = require('https');
    const authBody = JSON.stringify({ email, password });
    const authResult = await new Promise((resolve, reject) => {
      const authReq = https.request(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(authBody) }
      }, (authRes) => {
        let d = '';
        authRes.on('data', c => d += c);
        authRes.on('end', () => {
          console.log('SUPABASE AUTH STATUS:', authRes.statusCode);
          console.log('SUPABASE AUTH BODY:', d.substring(0, 500));
          resolve(JSON.parse(d));
        });
      });
      authReq.write(authBody);
      authReq.end();
    });

    if (authResult.error) {
      return res.status(401).json({ error: 'Credenciales invalidas.' });
    }

    if (!authResult.user) {
      console.error('AUTH NO USER:', JSON.stringify(authResult));
      return res.status(401).json({ error: 'Credenciales invalidas (no user).' });
    }

    const userId = authResult.user.id;

    const profiles = await supabaseQuery(`/rest/v1/users?id=eq.${userId}&select=*`);
    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

    if (!profile) {
      return res.status(401).json({ error: 'Perfil no encontrado.' });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: 'Cuenta desactivada.' });
    }

    const token = jwt.sign(
      { id: profile.id, email: profile.email, is_admin: profile.is_admin, role: profile.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        campaign: profile.campaign,
        shift: profile.shift,
        shift_start: profile.shift_start,
        shift_end: profile.shift_end,
        building: profile.building,
        floor: profile.floor,
        role: profile.role,
        position: profile.position,
        is_admin: profile.is_admin
      }
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error.message, error.stack);
    res.status(500).json({ error: 'Error al iniciar sesion: ' + error.message });
  }
});

async function verifySupabaseToken(token) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    https.get(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

router.post('/sync-user', async (req, res) => {
  try {
    const { supabase_token } = req.body;
    if (!supabase_token) {
      return res.status(400).json({ error: 'Token requerido.' });
    }

    const supaUser = await verifySupabaseToken(supabase_token);
    if (!supaUser.id) {
      return res.status(401).json({ error: 'Token invalido.' });
    }

    const profiles = await supabaseQuery(`/rest/v1/users?id=eq.${supaUser.id}&select=*`);
    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado. Registrate primero.' });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: 'Cuenta desactivada.' });
    }

    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        campaign: profile.campaign,
        shift: profile.shift,
        shift_start: profile.shift_start,
        shift_end: profile.shift_end,
        building: profile.building,
        floor: profile.floor,
        role: profile.role,
        position: profile.position,
        is_admin: profile.is_admin,
        photo: profile.photo,
        bio: profile.bio,
        interests: profile.interests
      }
    });
  } catch (error) {
    console.error('SYNC ERROR:', error.message);
    res.status(500).json({ error: 'Error al sincronizar usuario.' });
  }
});

router.post('/create-profile', async (req, res) => {
  try {
    const { supabase_token, email, name, age, campaign, shift, shift_start, shift_end, floor, role, position, bio, interests } = req.body;

    if (!supabase_token) {
      return res.status(400).json({ error: 'Token requerido.' });
    }

    const supaUser = await verifySupabaseToken(supabase_token);
    if (!supaUser.id) {
      return res.status(401).json({ error: 'Token invalido.' });
    }

    if (!isValidCorporateEmail(email)) {
      return res.status(400).json({ error: 'Debes usar un email @cat.com' });
    }

    const existing = await supabaseQuery(`/rest/v1/users?id=eq.${supaUser.id}&select=id`);
    if (existing && existing.length > 0) {
      return res.json({
        user: { id: supaUser.id, email, name, campaign, shift, role: role || 'agente', is_admin: false }
      });
      return;
    }

    const profileBody = JSON.stringify({
      id: supaUser.id,
      email,
      name,
      age: age || null,
      campaign,
      shift,
      shift_start,
      shift_end,
      floor: floor || null,
      role: role || 'agente',
      position: position || null,
      bio: bio || null,
      interests: interests || '[]',
      is_active: true,
      is_admin: false
    });

    const https = require('https');
    await new Promise((resolve, reject) => {
      const req2 = https.request(`${process.env.SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: { ...supabaseHeaders(), 'Content-Length': Buffer.byteLength(profileBody), 'Prefer': 'return=minimal' }
      }, (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => resolve(d));
      });
      req2.write(profileBody);
      req2.end();
    });

    res.status(201).json({
      user: { id: supaUser.id, email, name, campaign, shift, role: role || 'agente', is_admin: false }
    });
  } catch (error) {
    console.error('CREATE PROFILE ERROR:', error.message);
    res.status(500).json({ error: 'Error al crear perfil.' });
  }
});

module.exports = router;
