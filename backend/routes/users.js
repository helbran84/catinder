const express = require('express');
const https = require('https');
const db = require('../supabase-raw');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userResults = await db.get(`/rest/v1/users?select=*&id=eq.${encodeURIComponent(req.user.id)}`);
    const user = Array.isArray(userResults) && userResults.length > 0 ? userResults[0] : null;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (user.photo) {
      const urlData = await db.post(`/storage/v1/object/sign/profile-photos/${encodeURIComponent(user.photo)}`, { expiresIn: 3600 });
      user.photo_url = urlData?.signedUrl || null;
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener perfil.' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const {
      name, age, campaign, shift, shift_start, shift_end,
      building, floor, department, position, bio, interests,
      looking_for, hide_from_bosses
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = age;
    if (campaign !== undefined) updateData.campaign = campaign;
    if (shift !== undefined) updateData.shift = shift;
    if (shift_start !== undefined) updateData.shift_start = shift_start;
    if (shift_end !== undefined) updateData.shift_end = shift_end;
    if (building !== undefined) updateData.building = building;
    if (floor !== undefined) updateData.floor = floor;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (bio !== undefined) updateData.bio = bio;
    if (interests !== undefined) updateData.interests = interests;
    if (looking_for !== undefined) updateData.looking_for = looking_for;
    if (hide_from_bosses !== undefined) updateData.hide_from_bosses = hide_from_bosses;

    await db.patch(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}`, updateData, { 'Prefer': 'return=representation' });

    const updatedResults = await db.get(`/rest/v1/users?select=*&id=eq.${encodeURIComponent(req.user.id)}`);
    const updatedUser = Array.isArray(updatedResults) && updatedResults.length > 0 ? updatedResults[0] : null;

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar perfil.' });
  }
});

router.post('/upload-photo', authMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ error: 'No se envio ninguna imagen.' });
    }

    const file = req.files.photo;
    const ext = file.mimetype.split('/')[1];
    const fileName = `${req.user.id}/photo.${ext}`;

    const boundary = '----FormBoundary' + Date.now();
    const parts = [];
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`);
    parts.push(file.data);
    parts.push(`\r\n--${boundary}--\r\n`);

    const bodyBuffer = Buffer.concat([
      Buffer.from(parts[0], 'utf8'),
      Buffer.isBuffer(parts[1]) ? parts[1] : Buffer.from(parts[1], 'utf8'),
      Buffer.from(parts[2], 'utf8')
    ]);

    const storageKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const storageUrl = new URL(`${process.env.SUPABASE_URL}/storage/v1/object/profile-photos/${encodeURIComponent(fileName)}`);

    await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: storageUrl.hostname,
        path: storageUrl.pathname + storageUrl.search,
        method: 'POST',
        headers: {
          'apikey': storageKey,
          'Authorization': `Bearer ${storageKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length
        }
      }, (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => resolve(d));
      });
      req2.on('error', reject);
      req2.write(bodyBuffer);
      req2.end();
    });

    await db.patch(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}`, { photo: fileName }, { 'Prefer': 'return=representation' });

    const urlData = await db.post(`/storage/v1/object/sign/profile-photos/${encodeURIComponent(fileName)}`, { expiresIn: 3600 });

    res.json({ photo: fileName, photo_url: urlData?.signedUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir foto.' });
  }
});

router.get('/discover', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const currentUserResults = await db.get(`/rest/v1/users?select=*&id=eq.${encodeURIComponent(req.user.id)}`);
    const currentUser = Array.isArray(currentUserResults) && currentUserResults.length > 0 ? currentUserResults[0] : null;

    const swipedRows = await db.get(`/rest/v1/swipes?select=swiped_id&swiper_id=eq.${encodeURIComponent(req.user.id)}`);
    const swipedIds = (Array.isArray(swipedRows) ? swipedRows : []).map(s => s.swiped_id);

    const hiddenRoles = ['admin_sistema'];

    let filters = [
      'select=*',
      'is_active=eq.true',
      `id=neq.${encodeURIComponent(req.user.id)}`
    ];

    if (swipedIds.length > 0) {
      filters.push(`id=not.in.(${swipedIds.map(id => encodeURIComponent(id)).join(',')})`);
    }

    if (req.query.same_shift === 'true' && currentUser) {
      filters.push(`shift=eq.${encodeURIComponent(currentUser.shift)}`);
    }

    if (req.query.same_campaign === 'true' && currentUser) {
      filters.push(`campaign=eq.${encodeURIComponent(currentUser.campaign)}`);
    }

    if (req.query.same_building === 'true' && currentUser?.building) {
      filters.push(`building=eq.${encodeURIComponent(currentUser.building)}`);
    }

    if (req.query.same_floor === 'true' && currentUser?.floor) {
      filters.push(`floor=eq.${encodeURIComponent(currentUser.floor)}`);
    }

    if (req.query.role_filter && req.query.role_filter !== '') {
      filters.push(`role=eq.${encodeURIComponent(req.query.role_filter)}`);
    } else if (currentUser?.hide_from_bosses) {
      filters.push(`role=not.in.(${hiddenRoles.map(r => encodeURIComponent(r)).join(',')})`);
    }

    const profiles = await db.get(`/rest/v1/users?${filters.join('&')}`);

    const countResult = await new Promise((resolve, reject) => {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const url = new URL(`${process.env.SUPABASE_URL}/rest/v1/users?${filters.filter(f => !f.startsWith('select=')).join('&')}&select=*`);
      https.get(url.href, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': `${offset}-${offset + limit - 1}` }
      }, (res) => {
        const contentRange = res.headers['content-range'];
        let count = 0;
        if (contentRange) {
          const parts = contentRange.split('/');
          if (parts.length === 2 && parts[1] !== '*') count = parseInt(parts[1], 10);
        }
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ count, data: (() => { try { return JSON.parse(d); } catch(e) { return []; } })() }));
      }).on('error', reject);
    });

    const profilesResult = (Array.isArray(countResult.data) ? countResult.data : []).map(p => {
      if (p.interests) {
        p.interests = p.interests.split(',').map(i => i.trim());
      }
      return p;
    });

    res.json({
      profiles: profilesResult,
      pagination: {
        page,
        limit,
        total: countResult.count || 0,
        pages: Math.ceil((countResult.count || 0) / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al descubrir perfiles.' });
  }
});

router.post('/swipe/:direction/:userId', authMiddleware, async (req, res) => {
  try {
    const { direction, userId } = req.params;
    const swipedId = userId;

    if (!['like', 'nope'].includes(direction)) {
      return res.status(400).json({ error: 'Direccion invalida.' });
    }

    if (swipedId === req.user.id) {
      return res.status(400).json({ error: 'No puedes swiparte a ti mismo.' });
    }

    const existingSwipeResults = await db.get(`/rest/v1/swipes?select=id&swiper_id=eq.${encodeURIComponent(req.user.id)}&swiped_id=eq.${encodeURIComponent(swipedId)}`);
    const existingSwipe = Array.isArray(existingSwipeResults) && existingSwipeResults.length > 0 ? existingSwipeResults[0] : null;

    if (existingSwipe) {
      return res.status(400).json({ error: 'Ya has swipeado a este usuario.' });
    }

    await db.post('/rest/v1/swipes', {
      swiper_id: req.user.id,
      swiped_id: swipedId,
      direction
    }, { 'Prefer': 'return=representation' });

    if (direction === 'like') {
      const reverseSwipeResults = await db.get(`/rest/v1/swipes?select=id&swiper_id=eq.${encodeURIComponent(swipedId)}&swiped_id=eq.${encodeURIComponent(req.user.id)}&direction=eq.like`);
      const reverseSwipe = Array.isArray(reverseSwipeResults) && reverseSwipeResults.length > 0 ? reverseSwipeResults[0] : null;

      if (reverseSwipe) {
        const user1 = req.user.id < swipedId ? req.user.id : swipedId;
        const user2 = req.user.id < swipedId ? swipedId : req.user.id;

        const existingMatchResults = await db.get(`/rest/v1/matches?select=id&user1_id=eq.${encodeURIComponent(user1)}&user2_id=eq.${encodeURIComponent(user2)}`);
        const existingMatch = Array.isArray(existingMatchResults) && existingMatchResults.length > 0 ? existingMatchResults[0] : null;

        if (!existingMatch) {
          await db.post('/rest/v1/matches', { user1_id: user1, user2_id: user2 });

          return res.json({ matched: true, message: 'Match!' });
        }
      }
    }

    res.json({ matched: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al hacer swipe.' });
  }
});

router.post('/break/available', authMiddleware, async (req, res) => {
  try {
    await db.patch(`/rest/v1/break_requests?user_id=eq.${encodeURIComponent(req.user.id)}&is_available=eq.true`, { is_available: false });

    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    await db.post('/rest/v1/break_requests', {
      user_id: req.user.id,
      is_available: true,
      expires_at: expiresAt
    }, { 'Prefer': 'return=representation' });

    await db.patch(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}`, {
      is_on_break: true,
      break_start_time: new Date().toISOString()
    });

    res.json({ message: 'Ahora estas disponible para Break Match! (20 min)' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al activar Break Match.' });
  }
});

router.post('/break/stop', authMiddleware, async (req, res) => {
  try {
    await db.patch(`/rest/v1/break_requests?user_id=eq.${encodeURIComponent(req.user.id)}`, { is_available: false });

    await db.patch(`/rest/v1/users?id=eq.${encodeURIComponent(req.user.id)}`, { is_on_break: false });

    res.json({ message: 'Break Match desactivado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al desactivar Break Match.' });
  }
});

router.get('/break/find', authMiddleware, async (req, res) => {
  try {
    const currentUserResults2 = await db.get(`/rest/v1/users?select=*&id=eq.${encodeURIComponent(req.user.id)}`);
    const currentUser = Array.isArray(currentUserResults2) && currentUserResults2.length > 0 ? currentUserResults2[0] : null;

    const now = new Date().toISOString();

    const available = await db.get(`/rest/v1/break_requests?select=id,user_id,users:user_id(id,name,campaign,shift,building,floor,position,photo)&is_available=eq.true&expires_at=gt.${encodeURIComponent(now)}&user_id=neq.${encodeURIComponent(req.user.id)}`);

    if (Array.isArray(available) && available.error) throw available;

    const filtered = (Array.isArray(available) ? available : []).filter(br => {
      const u = br.users;
      if (!u) return false;
      if (u.shift !== currentUser.shift) return false;
      if (currentUser.building && u.building !== currentUser.building) return false;
      return true;
    }).slice(0, 5);

    if (filtered.length === 0) {
      return res.json({ message: 'No hay nadie disponible ahora.', available: [] });
    }

    const result = filtered.map(br => ({
      id: br.users.id,
      name: br.users.name,
      campaign: br.users.campaign,
      shift: br.users.shift,
      building: br.users.building,
      floor: br.users.floor,
      position: br.users.position,
      photo: br.users.photo
    }));

    res.json({ available: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar Break Match.' });
  }
});

router.get('/break/zones', authMiddleware, async (req, res) => {
  try {
    const now = new Date().toISOString();

    const available = await db.get(`/rest/v1/break_requests?select=id,user_id,users:user_id(id,name,campaign,shift,floor,position,photo)&is_available=eq.true&expires_at=gt.${encodeURIComponent(now)}`);

    if (Array.isArray(available) && available.error) throw available;

    const zones = {};
    (Array.isArray(available) ? available : []).forEach(br => {
      if (!br.users) return;
      const campaign = br.users.campaign || 'Sin sector';
      if (!zones[campaign]) {
        zones[campaign] = [];
      }
      zones[campaign].push({
        id: br.users.id,
        name: br.users.name,
        shift: br.users.shift,
        floor: br.users.floor,
        position: br.users.position,
        photo: br.users.photo
      });
    });

    const result = Object.entries(zones).map(([name, people]) => ({
      name,
      count: people.length,
      people
    })).sort((a, b) => b.count - a.count);

    res.json({ zones: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener zonas de break.' });
  }
});

router.post('/break/invite/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const now = new Date().toISOString();

    const targetAvailableResults = await db.get(`/rest/v1/break_requests?select=id&user_id=eq.${encodeURIComponent(targetUserId)}&is_available=eq.true&expires_at=gt.${encodeURIComponent(now)}`);
    const targetAvailable = Array.isArray(targetAvailableResults) && targetAvailableResults.length > 0 ? targetAvailableResults[0] : null;

    if (!targetAvailable) {
      return res.status(400).json({ error: 'Esta persona ya no esta disponible.' });
    }

    const user1 = req.user.id < targetUserId ? req.user.id : targetUserId;
    const user2 = req.user.id < targetUserId ? targetUserId : req.user.id;

    const existingMatchResults2 = await db.get(`/rest/v1/matches?select=id&user1_id=eq.${encodeURIComponent(user1)}&user2_id=eq.${encodeURIComponent(user2)}`);
    const existingMatch = Array.isArray(existingMatchResults2) && existingMatchResults2.length > 0 ? existingMatchResults2[0] : null;

    let matchId;

    if (!existingMatch) {
      const newMatchResults = await db.post('/rest/v1/matches', {
        user1_id: user1,
        user2_id: user2,
        is_break_match: true
      }, { 'Prefer': 'return=representation' });
      const newMatch = Array.isArray(newMatchResults) && newMatchResults.length > 0 ? newMatchResults[0] : newMatchResults;
      matchId = newMatch.id;
    } else {
      matchId = existingMatch.id;
    }

    await db.patch(`/rest/v1/break_requests?user_id=in.(${encodeURIComponent(req.user.id)},${encodeURIComponent(targetUserId)})`, { is_available: false });

    await db.patch(`/rest/v1/users?id=in.(${encodeURIComponent(req.user.id)},${encodeURIComponent(targetUserId)})`, { is_on_break: false });

    const targetUserResults = await db.get(`/rest/v1/users?select=name&id=eq.${encodeURIComponent(targetUserId)}`);
    const targetUser = Array.isArray(targetUserResults) && targetUserResults.length > 0 ? targetUserResults[0] : null;

    res.json({
      matched: true,
      message: `Match de break con ${targetUser?.name}! Tienen 20 minutos para verse.`,
      matchId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar invitacion.' });
  }
});

router.get('/shift-stats', authMiddleware, async (req, res) => {
  try {
    const currentUserResults3 = await db.get(`/rest/v1/users?select=shift&id=eq.${encodeURIComponent(req.user.id)}`);
    const currentUser = Array.isArray(currentUserResults3) && currentUserResults3.length > 0 ? currentUserResults3[0] : null;

    const allUsers = await db.get(`/rest/v1/users?select=shift&id=neq.${encodeURIComponent(req.user.id)}&is_active=eq.true`);

    const stats = { manana: 0, tarde: 0, noche: 0, madrugada: 0 };
    (Array.isArray(allUsers) ? allUsers : []).forEach(u => {
      if (stats[u.shift] !== undefined) stats[u.shift]++;
    });

    const sameShift = (Array.isArray(allUsers) ? allUsers : []).filter(u => u.shift === currentUser?.shift).length;

    res.json({
      total: stats,
      sameShift,
      myShift: currentUser?.shift
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadisticas.' });
  }
});

module.exports = router;
