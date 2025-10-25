const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      const error: any = new Error(errorData.error || `API Error: ${response.statusText}`);
      error.response = { data: errorData };
      throw error;
    }

    return response.json();
  }

  // Auth
  async loginWithTelegram(data: any) {
    return this.request('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Cards
  async getCards() {
    return this.request('/api/cards');
  }

  async getMyCards() {
    return this.request('/api/cards/my');
  }

  async addCard(cardId: number, nickname?: string) {
    return this.request('/api/cards/my', {
      method: 'POST',
      body: JSON.stringify({ cardId, nickname }),
    });
  }

  async removeCard(cardId: number) {
    return this.request(`/api/cards/my/${cardId}`, {
      method: 'DELETE',
    });
  }

  // Benefits
  async getMyBenefits(year?: number) {
    const query = year ? `?year=${year}` : '';
    return this.request(`/api/benefits/my${query}`);
  }

  async completeBenefit(benefitId: number, year?: number, notes?: string) {
    return this.request(`/api/benefits/${benefitId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ year, notes }),
    });
  }

  async uncompleteBenefit(benefitId: number, year?: number) {
    return this.request(`/api/benefits/${benefitId}/uncomplete`, {
      method: 'POST',
      body: JSON.stringify({ year }),
    });
  }

  async updateBenefitSettings(benefitId: number, year: number, settings: { reminderDays?: number; notificationEnabled?: boolean }) {
    return this.request(`/api/benefits/${benefitId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ year, ...settings }),
    });
  }

  // User
  async getMe() {
    return this.request('/api/users/me');
  }

  async updateLanguage(language: string) {
    return this.request('/api/users/me/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    });
  }

  // Admin - Cards
  async createCard(data: any) {
    return this.request('/api/admin/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCard(cardId: number, data: any) {
    return this.request(`/api/admin/cards/${cardId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCard(cardId: number) {
    return this.request(`/api/admin/cards/${cardId}`, {
      method: 'DELETE',
    });
  }

  // Admin - Benefits
  async createBenefit(cardId: number, data: any) {
    return this.request(`/api/admin/cards/${cardId}/benefits`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBenefit(benefitId: number, data: any) {
    return this.request(`/api/admin/benefits/${benefitId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBenefit(benefitId: number) {
    return this.request(`/api/admin/benefits/${benefitId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
