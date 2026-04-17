import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('aion_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('aion_token');
      localStorage.removeItem('aion_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const defectsApi = {
  getAll: (params?: any) => api.get('/defects', { params }),
  getOne: (id: number) => api.get(`/defects/${id}`),
  getMy: () => api.get('/defects/my'),
  getPendingReviews: () => api.get('/defects/pending-reviews'),
  upload: (file: File, componentId?: number) => {
    const fd = new FormData();
    fd.append('image', file);
    if (componentId) fd.append('componentId', String(componentId));
    return api.post('/defects/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  review: (id: number, data: any) => api.patch(`/defects/${id}/review`, data),
  getDecision: (id: number) => api.get(`/defects/${id}/decision`),
  requestResubmit: (id: number, reason: string) =>
    api.post(`/defects/${id}/request-resubmit`, { reason }),
  resubmit: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post(`/defects/${id}/resubmit`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const maintenanceOrdersApi = {
  getAll: (params?: any) => api.get('/maintenance-orders', { params }),
  getOne: (id: number) => api.get(`/maintenance-orders/${id}`),
  create: (data: any) => api.post('/maintenance-orders', data),
  approveDefectAndCreate: (defectId: number, decision: 'repair' | 'replace' | 'no_action', notes?: string) =>
    api.post('/maintenance-orders/approve-defect', { defectId, decision, notes }),
  update: (id: number, data: any) => api.patch(`/maintenance-orders/${id}`, data),
  approve: (id: number, data: any) => api.post(`/maintenance-orders/${id}/approve`, data),
  reject: (id: number, reason: string) => api.post(`/maintenance-orders/${id}/reject`, { reason }),
  getAuditTrail: (id: number) => api.get(`/maintenance-orders/${id}/audit-trail`),
};

export const inventoryApi = {
  getAll: () => api.get('/inventory'),
  check: (componentId: number, qty: number) => api.get('/inventory/check', { params: { componentId, qty } }),
  reserve: (maintenanceOrderId: number, items: any[]) => api.post('/inventory/reserve', { maintenanceOrderId, items }),
  release: (maintenanceOrderId: number) => api.post('/inventory/release', { maintenanceOrderId }),
  updateStock: (componentId: number, data: any) => api.patch(`/inventory/${componentId}`, data),
  getReservations: (moId: number) => api.get(`/inventory/reservations/${moId}`),
};

export const prsApi = {
  getAll: (params?: any) => api.get('/prs', { params }),
  getOne: (id: number) => api.get(`/prs/${id}`),
  create: (data: any) => api.post('/prs', data),
  update: (id: number, data: any) => api.patch(`/prs/${id}`, data),
  submit: (id: number) => api.post(`/prs/${id}/submit`),
  approve: (id: number) => api.post(`/prs/${id}/approve`),
  reject: (id: number, reason: string) => api.post(`/prs/${id}/reject`, { reason }),
  generateFromMo: (maintenanceOrderId: number, shortages?: any[]) =>
    api.post('/prs/generate-from-mo', { maintenanceOrderId, shortages }),
};

export const vendorsApi = {
  getAll: () => api.get('/vendors'),
  getOne: (id: number) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: number, data: any) => api.patch(`/vendors/${id}`, data),
  searchByComponent: (componentId: number) => api.get('/vendors/search/by-component', { params: { componentId } }),
  rank: (componentId: number, componentName: string) => api.post('/vendors/rank', { componentId, componentName }),
};

export const posApi = {
  getAll: (params?: any) => api.get('/pos', { params }),
  getOne: (id: number) => api.get(`/pos/${id}`),
  create: (data: any) => api.post('/pos', data),
  createFromPr: (data: any) => api.post('/pos/from-pr', data),
  approve: (id: number) => api.post(`/pos/${id}/approve`),
  updateStatus: (id: number, status: string) => api.patch(`/pos/${id}/status`, { status }),
};

export const goodsReceiptsApi = {
  getAll: () => api.get('/goods-receipts'),
  getOne: (id: number) => api.get(`/goods-receipts/${id}`),
  create: (data: any) => api.post('/goods-receipts', data),
};

export const invoicesApi = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  getOne: (id: number) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  approve: (id: number) => api.post(`/invoices/${id}/approve`),
  pay: (id: number) => api.post(`/invoices/${id}/pay`),
  reject: (id: number, reason: string) => api.post(`/invoices/${id}/reject`, { reason }),
};

export const componentsApi = {
  getAll: () => api.get('/components'),
  getOne: (id: number) => api.get(`/components/${id}`),
  create: (data: any) => api.post('/components', data),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.patch(`/users/${id}`, data),
  remove: (id: number) => api.delete(`/users/${id}`),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getTimeline: (moId: number) => api.get(`/dashboard/timeline/${moId}`),
  getInventoryStatus: () => api.get('/dashboard/inventory-status'),
  getAuditLog: (params?: any) => api.get('/dashboard/audit-log', { params }),
};

export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  deleteOne: (id: number) => api.delete(`/notifications/${id}`),
};

export const chatApi = {
  send: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []) =>
    api.post('/chat', { message, history }),
};

export default api;
