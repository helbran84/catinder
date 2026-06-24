const express = require('express');
const https = require('https');
const db = require('../supabase-raw');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const totalUsersResult = await db.get(`/rest/v1/users?select=id`);
    const totalUsers = Array.isArray(totalUsersResult) ? totalUsersResult.length : 0;

    const activeUsersResult = await db.get(`/rest/v1/users?select=id&is_active=eq.true`);
    const activeUsers = Array.isArray(activeUsersResult) ? activeUsersResult.length : 0;

    const totalMatchesResult = await db.get(`/rest/v1/matches?select=id`);
    const totalMatches = Array.isArray(totalMatchesResult) ? totalMatchesResult.length : 0;

    const totalMessagesResult = await db.get(`/rest/v1/messages?select=id`);
    const totalMessages = Array.isArray(totalMessagesResult) ? totalMessagesResult.length : 0;

    const allUsers = await db.get(`/rest/v1/users?select=department&department=not.is.null`);

    const deptMap = {};
    (Array.isArray(allUsers) ? allUsers : []).forEach(u => {
      deptMap[u.department] = (deptMap[u.department] || 0) + 1;
    });

    const departmentStats = Object.entries(deptMap)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      totalUsers,
      activeUsers,
      totalMatches,
      totalMessages,
      departmentStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadisticas.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await db.get(`/rest/v1/users?select=id,email,name,age,campaign,shift,department,position,role,is_active,is_admin,created_at&order=created_at.desc`);

    if (Array.isArray(users) && users.error) throw users;

    res.json(Array.isArray(users) ? users : []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

router.put('/users/:id/toggle-status', async (req, res) => {
  try {
    const userResults = await db.get(`/rest/v1/users?select=id,is_active&id=eq.${encodeURIComponent(req.params.id)}`);
    const user = Array.isArray(userResults) && userResults.length > 0 ? userResults[0] : null;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    await db.patch(`/rest/v1/users?id=eq.${encodeURIComponent(req.params.id)}`, { is_active: !user.is_active });

    res.json({ message: 'Estado actualizado.', is_active: !user.is_active });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
});

router.put('/users/:id/toggle-admin', async (req, res) => {
  try {
    const userResults2 = await db.get(`/rest/v1/users?select=id,is_admin&id=eq.${encodeURIComponent(req.params.id)}`);
    const user = Array.isArray(userResults2) && userResults2.length > 0 ? userResults2[0] : null;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    await db.patch(`/rest/v1/users?id=eq.${encodeURIComponent(req.params.id)}`, { is_admin: !user.is_admin });

    res.json({ message: 'Rol actualizado.', is_admin: !user.is_admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar rol.' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const userResults3 = await db.get(`/rest/v1/users?select=id&id=eq.${encodeURIComponent(req.params.id)}`);
    const user = Array.isArray(userResults3) && userResults3.length > 0 ? userResults3[0] : null;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    await db.del(`/rest/v1/messages?sender_id=eq.${encodeURIComponent(req.params.id)}`);
    await db.del(`/rest/v1/swipes?swiper_id=eq.${encodeURIComponent(req.params.id)}`);
    await db.del(`/rest/v1/swipes?swiped_id=eq.${encodeURIComponent(req.params.id)}`);
    await db.del(`/rest/v1/matches?user1_id=eq.${encodeURIComponent(req.params.id)}`);
    await db.del(`/rest/v1/matches?user2_id=eq.${encodeURIComponent(req.params.id)}`);
    await db.del(`/rest/v1/break_requests?user_id=eq.${encodeURIComponent(req.params.id)}`);

    const storageKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const storageUrl = new URL(`${process.env.SUPABASE_URL}/storage/v1/object/profile-photos/${encodeURIComponent(req.params.id)}/`);
    await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: storageUrl.hostname,
        path: storageUrl.pathname + storageUrl.search,
        method: 'DELETE',
        headers: { 'apikey': storageKey, 'Authorization': `Bearer ${storageKey}` }
      }, (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => resolve(d));
      });
      req2.on('error', reject);
      req2.end();
    });

    await db.del(`/rest/v1/users?id=eq.${encodeURIComponent(req.params.id)}`);

    const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authUrl = new URL(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(req.params.id)}`);
    await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: authUrl.hostname,
        path: authUrl.pathname + authUrl.search,
        method: 'DELETE',
        headers: { 'apikey': authKey, 'Authorization': `Bearer ${authKey}` }
      }, (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => resolve(d));
      });
      req2.on('error', reject);
      req2.end();
    });

    res.json({ message: 'Usuario eliminado permanentemente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, password, name, age, department, position, campaign, shift, shift_start, shift_end, role, is_admin } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password y nombre son requeridos.' });
    }

    const existingUserResults = await db.get(`/rest/v1/users?select=id&email=eq.${encodeURIComponent(email)}`);
    const existingUser = Array.isArray(existingUserResults) && existingUserResults.length > 0 ? existingUserResults[0] : null;

    if (existingUser) {
      return res.status(400).json({ error: 'El email ya esta registrado.' });
    }

    const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authUrl = new URL(`${process.env.SUPABASE_URL}/auth/v1/admin/users`);
    const authData = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ email, password, email_confirm: true });
      const req2 = https.request({
        hostname: authUrl.hostname,
        path: authUrl.pathname + authUrl.search,
        method: 'POST',
        headers: { 'apikey': authKey, 'Authorization': `Bearer ${authKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
      });
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });

    if (authData.code) throw authData;

    await db.post('/rest/v1/users', {
      id: authData.id,
      email,
      name,
      age: age || null,
      campaign: campaign || 'Sin campana',
      shift: shift || 'manana',
      shift_start: shift_start || '08:00',
      shift_end: shift_end || '14:00',
      department: department || null,
      position: position || null,
      role: role || 'agente',
      is_admin: is_admin || false
    }, { 'Prefer': 'return=representation' });

    res.status(201).json({ id: authData.id, email, name, message: 'Usuario creado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
});

module.exports = router;
