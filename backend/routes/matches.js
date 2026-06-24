const express = require('express');
const db = require('../supabase-raw');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const matches = await db.get(`/rest/v1/matches?select=id,created_at,is_break_match,user1:user1_id(id,name,photo,department,building,floor,shift),user2:user2_id(id,name,photo,department,building,floor,shift)&or=(user1_id.eq.${encodeURIComponent(req.user.id)},user2_id.eq.${encodeURIComponent(req.user.id)})&order=created_at.desc`);

    if (Array.isArray(matches) && matches.error) throw matches;

    const matchesWithInfo = await Promise.all((Array.isArray(matches) ? matches : []).map(async (match) => {
      const otherUser = match.user1?.id === req.user.id ? match.user2 : match.user1;

      const lastMessageResults = await db.get(`/rest/v1/messages?select=content,created_at&match_id=eq.${encodeURIComponent(match.id)}&order=created_at.desc&limit=1`);
      const lastMessage = Array.isArray(lastMessageResults) && lastMessageResults.length > 0 ? lastMessageResults[0] : null;

      let photo_url = null;
      if (otherUser?.photo) {
        const urlData = await db.post(`/storage/v1/object/sign/profile-photos/${encodeURIComponent(otherUser.photo)}`, { expiresIn: 3600 });
        photo_url = urlData?.signedUrl;
      }

      return {
        id: match.id,
        otherUser: {
          ...otherUser,
          photo_url
        },
        lastMessage: lastMessage || null,
        is_break_match: match.is_break_match,
        createdAt: match.created_at
      };
    }));

    res.json(matchesWithInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener matches.' });
  }
});

router.get('/:matchId/messages', authMiddleware, async (req, res) => {
  try {
    const matchResults = await db.get(`/rest/v1/matches?select=id&id=eq.${encodeURIComponent(req.params.matchId)}&or=(user1_id.eq.${encodeURIComponent(req.user.id)},user2_id.eq.${encodeURIComponent(req.user.id)})`);
    const match = Array.isArray(matchResults) && matchResults.length > 0 ? matchResults[0] : null;

    if (!match) {
      return res.status(404).json({ error: 'Match no encontrado.' });
    }

    const messages = await db.get(`/rest/v1/messages?select=*,sender:sender_id(id,name)&match_id=eq.${encodeURIComponent(req.params.matchId)}&order=created_at.asc`);

    if (Array.isArray(messages) && messages.error) throw messages;

    await db.patch(`/rest/v1/messages?match_id=eq.${encodeURIComponent(req.params.matchId)}&sender_id=neq.${encodeURIComponent(req.user.id)}&is_read=eq.false`, { is_read: true });

    const formattedMessages = (Array.isArray(messages) ? messages : []).map(m => ({
      ...m,
      sender_name: m.sender?.name
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener mensajes.' });
  }
});

router.post('/:matchId/messages', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacio.' });
    }

    const matchResults2 = await db.get(`/rest/v1/matches?select=id&id=eq.${encodeURIComponent(req.params.matchId)}&or=(user1_id.eq.${encodeURIComponent(req.user.id)},user2_id.eq.${encodeURIComponent(req.user.id)})`);
    const match = Array.isArray(matchResults2) && matchResults2.length > 0 ? matchResults2[0] : null;

    if (!match) {
      return res.status(404).json({ error: 'Match no encontrado.' });
    }

    const newMessageResults = await db.post('/rest/v1/messages', {
      match_id: parseInt(req.params.matchId),
      sender_id: req.user.id,
      content: content.trim()
    }, { 'Prefer': 'return=representation' });
    const newMessage = Array.isArray(newMessageResults) && newMessageResults.length > 0 ? newMessageResults[0] : newMessageResults;

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar mensaje.' });
  }
});

module.exports = router;
