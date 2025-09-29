import axios, { AxiosInstance, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import {
  AuthResponseDto,
  LoginDto,
  RegisterDto,
  UserResponseDto,
  CampaignResponseDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  ContentResponseDto,
  CreateContentDto,
  UpdateContentDto,
  GenerateAIContentDto,
  RegenerateAIContentDto,
  TranslationResponseDto,
  CreateTranslationDto,
  GenerateAITranslationDto,
  UpdateTranslationDto,
  RegenerateTranslationDto,
  CampaignStatus,
  ContentStatus,
  TranslationStatus
} from '@/types';

class ApiClient {
  private client: AxiosInstance;
  private readonly TOKEN_KEY = 'access_token';

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor para agregar token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor para manejar errores
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          // Clear user data from localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user_data');
          }
          // Redirect to login if needed
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  setToken(token: string): void {
    Cookies.set(this.TOKEN_KEY, token, { expires: 7 }); // 7 days
  }

  getToken(): string | undefined {
    return Cookies.get(this.TOKEN_KEY);
  }

  clearToken(): void {
    Cookies.remove(this.TOKEN_KEY);
    // Also clear user data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_data');
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Auth endpoints
  async login(data: LoginDto): Promise<AuthResponseDto> {
    const response: AxiosResponse<AuthResponseDto> = await this.client.post('/auth/login', data);
    this.setToken(response.data.access_token);
    return response.data;
  }

  async register(data: RegisterDto): Promise<AuthResponseDto> {
    const response: AxiosResponse<AuthResponseDto> = await this.client.post('/auth/register', data);
    this.setToken(response.data.access_token);
    return response.data;
  }

  async logout(): Promise<void> {
    this.clearToken();
  }

  // Users endpoints
  async getUsers(): Promise<UserResponseDto[]> {
    const response: AxiosResponse<UserResponseDto[]> = await this.client.get('/users');
    return response.data;
  }

  async getUser(id: string): Promise<UserResponseDto> {
    const response: AxiosResponse<UserResponseDto> = await this.client.get(`/users/${id}`);
    return response.data;
  }

  // Campaigns endpoints
  async getCampaigns(status?: CampaignStatus): Promise<CampaignResponseDto[]> {
    const params = status ? { status } : {};
    const response: AxiosResponse<CampaignResponseDto[]> = await this.client.get('/campaigns', { params });
    return response.data;
  }

  async getCampaign(id: string): Promise<CampaignResponseDto> {
    const response: AxiosResponse<CampaignResponseDto> = await this.client.get(`/campaigns/${id}`);
    return response.data;
  }

  async createCampaign(data: CreateCampaignDto): Promise<CampaignResponseDto> {
    const response: AxiosResponse<CampaignResponseDto> = await this.client.post('/campaigns', data);
    return response.data;
  }

  async updateCampaign(id: string, data: UpdateCampaignDto): Promise<CampaignResponseDto> {
    const response: AxiosResponse<CampaignResponseDto> = await this.client.patch(`/campaigns/${id}`, data);
    return response.data;
  }

  async deleteCampaign(id: string): Promise<CampaignResponseDto> {
    const response: AxiosResponse<CampaignResponseDto> = await this.client.delete(`/campaigns/${id}`);
    return response.data;
  }

  async getCampaignContent(campaignId: string): Promise<ContentResponseDto[]> {
    const response: AxiosResponse<ContentResponseDto[]> = await this.client.get(`/campaigns/${campaignId}/content`);
    return response.data;
  }

  async createCampaignContent(campaignId: string, data: CreateContentDto): Promise<ContentResponseDto> {
    const response: AxiosResponse<ContentResponseDto> = await this.client.post(`/campaigns/${campaignId}/content`, data);
    return response.data;
  }

  // Content endpoints
  async getContent(campaignId?: string, status?: ContentStatus): Promise<ContentResponseDto[]> {
    const params: any = {};
    if (campaignId) params.campaignId = campaignId;
    if (status) params.status = status;
    
    const response: AxiosResponse<ContentResponseDto[]> = await this.client.get('/content', { params });
    return response.data;
  }

  async getContentById(id: string): Promise<ContentResponseDto> {
    const response: AxiosResponse<ContentResponseDto> = await this.client.get(`/content/${id}`);
    return response.data;
  }

  async updateContent(id: string, data: UpdateContentDto): Promise<ContentResponseDto> {
    const response: AxiosResponse<ContentResponseDto> = await this.client.patch(`/content/${id}`, data);
    return response.data;
  }

  async deleteContent(id: string): Promise<ContentResponseDto> {
    const response: AxiosResponse<ContentResponseDto> = await this.client.delete(`/content/${id}`);
    return response.data;
  }

  async generateAIContent(id: string, data: GenerateAIContentDto): Promise<ContentResponseDto> {
    const response: AxiosResponse<ContentResponseDto> = await this.client.post(`/content/${id}/generate-ai`, data);
    return response.data;
  }

  async regenerateAIContent(id: string, data: RegenerateAIContentDto): Promise<ContentResponseDto> {
    const response: AxiosResponse<ContentResponseDto> = await this.client.post(`/content/${id}/regenerate-ai`, data);
    return response.data;
  }

  async getContentTranslations(contentId: string): Promise<TranslationResponseDto[]> {
    const response: AxiosResponse<TranslationResponseDto[]> = await this.client.get(`/content/${contentId}/translations`);
    return response.data;
  }

  async createContentTranslation(contentId: string, data: CreateTranslationDto): Promise<TranslationResponseDto> {
    const response: AxiosResponse<TranslationResponseDto> = await this.client.post(`/content/${contentId}/translations`, data);
    return response.data;
  }

  async generateAITranslation(contentId: string, data: GenerateAITranslationDto): Promise<TranslationResponseDto> {
    const response: AxiosResponse<TranslationResponseDto> = await this.client.post(`/content/${contentId}/translations/generate`, data);
    return response.data;
  }

  // Translations endpoints
  async getTranslations(
    status?: TranslationStatus, 
    language?: string, 
    contentPieceId?: string
  ): Promise<TranslationResponseDto[]> {
    const params: any = {};
    if (status) params.status = status;
    if (language) params.language = language;
    if (contentPieceId) params.contentPieceId = contentPieceId;

    const response: AxiosResponse<TranslationResponseDto[]> = await this.client.get('/translations', { params });
    return response.data;
  }

  async getTranslation(id: string): Promise<TranslationResponseDto> {
    const response: AxiosResponse<TranslationResponseDto> = await this.client.get(`/translations/${id}`);
    return response.data;
  }

  async updateTranslation(id: string, data: UpdateTranslationDto): Promise<TranslationResponseDto> {
    const response: AxiosResponse<TranslationResponseDto> = await this.client.patch(`/translations/${id}`, data);
    return response.data;
  }

  async deleteTranslation(id: string): Promise<TranslationResponseDto> {
    const response: AxiosResponse<TranslationResponseDto> = await this.client.delete(`/translations/${id}`);
    return response.data;
  }

  async regenerateTranslation(id: string, data: RegenerateTranslationDto): Promise<TranslationResponseDto> {
    const response: AxiosResponse<TranslationResponseDto> = await this.client.post(`/translations/${id}/regenerate`, data);
    return response.data;
  }
}

export const apiClient = new ApiClient();
