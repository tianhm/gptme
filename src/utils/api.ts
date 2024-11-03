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

export class ApiClient {
  public baseUrl: string;
  private _isConnected: boolean = false;

  constructor(baseUrl: string = DEFAULT_API_URL) {
    this.baseUrl = baseUrl;
    this.checkConnection();
  }

  get isConnected() {
    return this._isConnected;
  }

  async checkConnection() {
    try {
      console.log('ApiClient: Checking connection to:', this.baseUrl);
      const response = await fetch(`${this.baseUrl}/api`, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('ApiClient: Connection response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        type: response.type,
      });

      if (response.ok) {
        this._isConnected = true;
        console.log('ApiClient: Connection successful');
        return true;
      } else {
        this._isConnected = false;
        console.error('ApiClient: Connection failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('ApiClient: Connection error:', error);
      this._isConnected = false;
      return false;
    }
  }

  async getConversations(limit: number = 100) {
    if (!this._isConnected) {
      console.warn('ApiClient: Not connected, cannot fetch conversations');
      return [];
    }
    const response = await axios.get(`${this.baseUrl}/api/conversations?limit=${limit}`);
    return response.data;
  }

  async getConversation(logfile: string) {
    if (!this._isConnected) {
      console.warn('ApiClient: Not connected, cannot fetch conversation');
      return [];
    }
    const response = await axios.get(`${this.baseUrl}/api/conversations/${logfile}`);
    return response.data;
  }

  async createConversation(logfile: string, messages: Message[]) {
    if (!this._isConnected) {
      throw new Error('Not connected to API');
    }
    const response = await axios.put(`${this.baseUrl}/api/conversations/${logfile}`, {
      messages,
    });
    return response.data;
  }

  async sendMessage(logfile: string, message: Message, branch: string = 'main') {
    if (!this._isConnected) {
      throw new Error('Not connected to API');
    }
    const response = await axios.post(`${this.baseUrl}/api/conversations/${logfile}`, {
      ...message,
      branch,
    });
    return response.data;
  }

  async generateResponse(logfile: string, model?: string, branch: string = 'main') {
    if (!this._isConnected) {
      throw new Error('Not connected to API');
    }
    const response = await axios.post(`${this.baseUrl}/api/conversations/${logfile}/generate`, {
      model,
      branch,
    });
    return response.data;
  }
}

export const createApiClient = (baseUrl?: string) => new ApiClient(baseUrl);