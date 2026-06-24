const https = require('https');
require('dotenv').config();

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra = {}) {
  return { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra };
}

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(`${URL}${path}`, { headers: headers() }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve([]); } });
    }).on('error', reject);
  });
}

function post(path, body, extra = {}) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(`${URL}${path}`, {
      method: 'POST', headers: headers({ 'Content-Length': Buffer.byteLength(data), ...extra })
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    req.write(data);
    req.end();
  });
}

function patch(path, body, extra = {}) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(`${URL}${path}`, {
      method: 'PATCH', headers: headers({ 'Content-Length': Buffer.byteLength(data), ...extra })
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    req.write(data);
    req.end();
  });
}

function del(path) {
  return new Promise((resolve, reject) => {
    const req = https.request(`${URL}${path}`, {
      method: 'DELETE', headers: headers()
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    req.end();
  });
}

module.exports = { get, post, patch, del, headers, URL, KEY };
