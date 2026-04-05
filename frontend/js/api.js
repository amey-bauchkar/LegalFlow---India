// ============================================================
// LegalFlow India – Centralized API Client Module
// Handles all API requests, JWT injection, 401 handling
// ============================================================

const API_BASE = window.location.origin + '/api';

class LegalFlowAPI {
  constructor() {
    this.token = localStorage.getItem('lf_token') || null;
    this.onUnauthorized = null; // callback when 401 received
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('lf_token', token);
    } else {
      localStorage.removeItem('lf_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('lf_token');
  }

  clearAuth() {
    this.token = null;
    localStorage.removeItem('lf_token');
    localStorage.removeItem('lf_user');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      
      // Handle 401 globally
      if (res.status === 401) {
        this.clearAuth();
        if (this.onUnauthorized) this.onUnauthorized();
        return { success: false, message: 'Session expired. Please login again.', data: null };
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      return { success: false, message: 'Network error. Please try again.', data: null };
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  async put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  async del(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async uploadFile(endpoint, formData) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(url, { method: 'POST', headers, body: formData });
      if (res.status === 401) {
        this.clearAuth();
        if (this.onUnauthorized) this.onUnauthorized();
        return { success: false, message: 'Session expired.', data: null };
      }
      return await res.json();
    } catch (err) {
      console.error(`Upload Error [${endpoint}]:`, err);
      return { success: false, message: 'Upload failed.', data: null };
    }
  }

  // ---- Auth ----
  async signup(name, email, password, role, linkedClientId) {
    return this.post('/auth/signup', { name, email, password, role, linkedClientId });
  }
  async login(email, password) {
    return this.post('/auth/login', { email, password });
  }
  async getMe() {
    return this.get('/auth/me');
  }

  // ---- Dashboard ----
  async getDashboardStats() {
    return this.get('/dashboard/stats');
  }

  // ---- Cases ----
  async getCases(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/cases${qs ? '?' + qs : ''}`);
  }
  async getCase(id) {
    return this.get(`/cases/${id}`);
  }
  async createCase(data) {
    return this.post('/cases', data);
  }
  async updateCase(id, data) {
    return this.put(`/cases/${id}`, data);
  }
  async deleteCase(id) {
    return this.del(`/cases/${id}`);
  }

  // ---- Clients ----
  async getClients(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/clients${qs ? '?' + qs : ''}`);
  }
  async getClient(id) {
    return this.get(`/clients/${id}`);
  }
  async createClient(data) {
    return this.post('/clients', data);
  }
  async updateClient(id, data) {
    return this.put(`/clients/${id}`, data);
  }

  // ---- Documents ----
  async getDocuments(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/documents${qs ? '?' + qs : ''}`);
  }
  async uploadDocument(formData) {
    return this.uploadFile('/documents/upload', formData);
  }
  async signDocument(id) {
    return this.put(`/documents/${id}/sign`, {});
  }

  // ---- Invoices ----
  async getInvoices(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/invoices${qs ? '?' + qs : ''}`);
  }
  async createInvoice(data) {
    return this.post('/invoices', data);
  }
  async updateInvoice(id, data) {
    return this.put(`/invoices/${id}`, data);
  }

  // ---- Tasks ----
  async getTasks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/tasks${qs ? '?' + qs : ''}`);
  }
  async createTask(data) {
    return this.post('/tasks', data);
  }
  async updateTask(id, data) {
    return this.put(`/tasks/${id}`, data);
  }

  // ---- Users ----
  async getUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/users${qs ? '?' + qs : ''}`);
  }
  async getUser(id) {
    return this.get(`/users/${id}`);
  }

  // ---- Calendar ----
  async getCalendarEvents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/calendar${qs ? '?' + qs : ''}`);
  }
  async createCalendarEvent(data) {
    return this.post('/calendar', data);
  }
  async updateCalendarEvent(id, data) {
    return this.put(`/calendar/${id}`, data);
  }

  // ---- Messages ----
  async getMessages(caseId, params = {}) {
    const qs = new URLSearchParams({ caseId, ...params }).toString();
    return this.get(`/messages?${qs}`);
  }
  async sendMessage(caseId, text) {
    return this.post('/messages', { caseId, text });
  }

  // ---- Notifications ----
  async getNotifications(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/notifications${qs ? '?' + qs : ''}`);
  }
  async getUnreadCount() {
    return this.get('/notifications/unread-count');
  }
  async markNotificationRead(id) {
    return this.put(`/notifications/${id}/read`, {});
  }
  async markAllNotificationsRead() {
    return this.put('/notifications/read-all', {});
  }

  // ---- Audit Logs ----
  async getAuditLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/audit-logs${qs ? '?' + qs : ''}`);
  }

  // ---- Document Requests ----
  async getDocumentRequests(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.get(`/document-requests${qs ? '?' + qs : ''}`);
  }
  async createDocumentRequest(data) {
    return this.post('/document-requests', data);
  }
  async updateDocumentRequest(id, data) {
    return this.put(`/document-requests/${id}`, data);
  }

  // ---- Workflow ----
  async getWorkflowAlerts() {
    return this.get('/workflow/alerts');
  }
  async generateNotifications() {
    return this.post('/workflow/generate-notifications', {});
  }
}

// Global singleton
window.lfAPI = new LegalFlowAPI();
