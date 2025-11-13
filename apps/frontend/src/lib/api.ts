const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // If no token exists and we have a dev token, use it
    if (!token && process.env.NEXT_PUBLIC_DEV_TOKEN) {
      token = process.env.NEXT_PUBLIC_DEV_TOKEN;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
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

  async getBanks(language?: string) {
    const query = language ? `?language=${language}` : '';
    return this.request(`/api/cards/banks${query}`);
  }

  async getMyCards() {
    return this.request('/api/cards/my');
  }

  async addCard(cardId: number, nickname?: string, benefitStartDates?: Record<number, string>) {
    return this.request('/api/cards/my', {
      method: 'POST',
      body: JSON.stringify({ cardId, nickname, benefitStartDates }),
    });
  }

  async removeCard(userCardId: number) {
    return this.request(`/api/cards/my/${userCardId}`, {
      method: 'DELETE',
    });
  }

  async updateCardSettings(userCardId: number, settings: { nickname?: string; afChargeMonth?: number | null; afChargeDay?: number | null; openedAt?: string | null }) {
    return this.request(`/api/cards/my/${userCardId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // Benefits
  async getMyBenefits(year?: number) {
    const query = year ? `?year=${year}` : '';
    return this.request(`/api/benefits/my${query}`);
  }

  async completeBenefit(benefitId: number, year?: number, notes?: string, userCardId?: number) {
    return this.request(`/api/benefits/${benefitId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ year, notes, userCardId }),
    });
  }

  async uncompleteBenefit(benefitId: number, year?: number, userCardId?: number) {
    return this.request(`/api/benefits/${benefitId}/uncomplete`, {
      method: 'POST',
      body: JSON.stringify({ year, userCardId }),
    });
  }

  async updateBenefitSettings(benefitId: number, year: number, settings: { reminderDays?: number; notificationEnabled?: boolean }, userCardId?: number) {
    return this.request(`/api/benefits/${benefitId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ year, ...settings, userCardId }),
    });
  }

  async createCustomBenefit(data: {
    userCardId: number;
    customTitle: string;
    customTitleEn?: string;
    customAmount: number;
    customCurrency: string;
    periodEnd: string;
  }) {
    return this.request('/api/benefits/custom', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomBenefit(id: number, data: {
    customTitle?: string;
    customTitleEn?: string;
    customAmount?: number;
    customCurrency?: string;
    periodEnd?: string;
  }) {
    return this.request(`/api/benefits/custom/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomBenefit(id: number) {
    return this.request(`/api/benefits/custom/${id}`, {
      method: 'DELETE',
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

  // Feedback
  async submitFeedback(data: { name: string; email: string; message: string }) {
    return this.request('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
