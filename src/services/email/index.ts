import axios, { type AxiosInstance } from 'axios';
import FormData from 'form-data';

export class EmailService {
  private readonly httpClient: AxiosInstance;
  private readonly apiUrl: string;

  public constructor(
    private readonly apiKey: string,
    baseUrl: string
  ) {
    this.apiUrl = baseUrl;
    this.httpClient = axios.create({
      auth: {
        username: 'api',
        password: this.apiKey
      }
    });
  }

  public async sendEmail(): Promise<void> {
    const form = new FormData();
    
    form.append('from', options.from);
  }
}
