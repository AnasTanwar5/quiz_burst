// Minimal frontend API helper used by pages

// Simple REST API helper used by pages after backend enablement
export const api = {
  baseUrl: import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.host),
  token: () => localStorage.getItem('authToken') || '',
  headers() {
    const h = { 'Content-Type': 'application/json' } as Record<string, string>;
    const t = this.token();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  },
  async post(path: string, body?: any) {
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body || {}) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Request failed');
    return data;
  },
  async get(path: string) {
    console.log('API GET:', path, 'Token:', this.token() ? 'present' : 'missing'); // Debug log
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() });
    const data = await res.json().catch(() => ({}));
    console.log('API GET response:', path, res.status, data); // Debug log
    if (!res.ok) throw new Error(data?.message || 'Request failed');
    return data;
  },
  async delete(path: string) {
    console.log('API DELETE:', path, 'Token:', this.token() ? 'present' : 'missing'); // Debug log
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers() });
    const data = await res.json().catch(() => ({}));
    console.log('API DELETE response:', path, res.status, data); // Debug log
    if (!res.ok) throw new Error(data?.message || 'Request failed');
    return data;
  }
};