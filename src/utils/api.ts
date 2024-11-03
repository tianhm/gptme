import axios from 'axios';

const DEFAULT_API_URL = 'http://127.0.0.1:5000';

interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

interface Conversation {
  id: string;
  name: string;
  messages: Message[];
}

class ApiClient {
  private baseUrl: string;
  public isConnected: boolean = false;

  constructor(baseUrl: string = DEFAULT_API_URL) {
    this.baseUrl = baseUrl;
    this.checkConnection();
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
    this.checkConnection();
  }

  private async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api`);
      this.isConnected = response.ok;
    } catch {
      this.isConnected = false;
    }
  }

  async getConversations(limit: number = 100) {
    const response = await axios.get(`${this.baseUrl}/api/conversations?limit=${limit}`);
    return response.data;
  }

  async getConversation(logfile: string) {
    const response = await axios.get(`${this.baseUrl}/api/conversations/${logfile}`);
    return response.data;
  }

  async createConversation(logfile: string, messages: Message[]) {
    const response = await axios.put(`${this.baseUrl}/api/conversations/${logfile}`, {
      messages,
    });
    return response.data;
  }

  async sendMessage(logfile: string, message: Message, branch: string = 'main') {
    const response = await axios.post(`${this.baseUrl}/api/conversations/${logfile}`, {
      ...message,
      branch,
    });
    return response.data;
  }

  async generateResponse(logfile: string, model?: string, branch: string = 'main') {
    const response = await axios.post(`${this.baseUrl}/api/conversations/${logfile}/generate`, {
      model,
      branch,
    });
    return response.data;
  }
}

export const createApiClient = (baseUrl?: string) => new ApiClient(baseUrl);