const BASE = '/api';

let _token = null;
export function setToken(t) { _token = t; localStorage.setItem('maxes_token', t); }
export function getToken() { return _token || localStorage.getItem('maxes_token'); }
export function clearToken() { _token = null; localStorage.removeItem('maxes_token'); }

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (res.status === 401) { clearToken(); window.location.href = '/login'; return; }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (u, p) => req('POST', '/auth/login', { username: u, password: p }),
  sso: (token) => req('POST', '/auth/sso', { token }),

  getPods: () => req('GET', '/pods'),
  createPod: (name) => req('POST', '/pods', { name }),
  updatePod: (id, name) => req('PUT', `/pods/${id}`, { name }),
  deletePod: (id) => req('DELETE', `/pods/${id}`),

  getDuplicates: () => req('GET', '/players/duplicates'),
  getPlayers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/players${qs ? '?' + qs : ''}`);
  },
  createPlayer: (data) => req('POST', '/players', data),
  updatePlayer: (id, data) => req('PUT', `/players/${id}`, data),
  deletePlayer: (id) => req('DELETE', `/players/${id}`),
  assignPod: (id, pod_id) => req('PATCH', `/players/${id}/pod`, { pod_id }),
  getPlayerStats: (id) => req('GET', `/players/${id}/stats`),
  getMyPlayer: () => req('GET', '/players/me'),

  getSessions: () => req('GET', '/sessions'),
  createSession: (data) => req('POST', '/sessions', data),
  updateSession: (id, data) => req('PUT', `/sessions/${id}`, data),
  deleteSession: (id) => req('DELETE', `/sessions/${id}`),
  getSessionData: (id) => req('GET', `/sessions/${id}/data`),

  saveEntry: (data) => req('POST', '/entries', data),
  saveBulk: (session_id, entries) => req('POST', '/entries/bulk', { session_id, entries }),
  saveSpeed: (data) => req('POST', '/entries/speed', data),

  getLeaderboard: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/leaderboard${qs ? '?' + qs : ''}`);
  },
};
