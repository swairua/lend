/**
 * M-Pesa Daraja API Integration
 * Handles OAuth2 token flow, C2B checkout, B2C disbursements
 */

interface DarajaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface C2BResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface B2CResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

interface TransactionStatus {
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  amount: number;
  reference: string;
  timestamp: string;
}

class MpesaClient {
  private config: DarajaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: DarajaConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    return this.config.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
  }

  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`OAuth token request failed: ${response.statusText}`);
      }

      const data: TokenResponse = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000 * 0.9);
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get M-Pesa access token:', error);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  async initiateC2BPayment(params: {
    amount: number;
    phoneNumber: string;
    accountReference: string;
    transactionDesc: string;
  }): Promise<C2BResponse> {
    const token = await this.getAccessToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:-]/g, '')
      .slice(0, 14);
    const password = Buffer.from(
      `${this.config.businessShortCode}${this.config.passkey}${timestamp}`
    ).toString('base64');

    const payload = {
      BusinessShortCode: this.config.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(params.amount),
      PartyA: params.phoneNumber,
      PartyB: this.config.businessShortCode,
      PhoneNumber: params.phoneNumber,
      CallBackURL: this.config.callbackUrl,
      AccountReference: params.accountReference,
      TransactionDesc: params.transactionDesc,
    };

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `C2B request failed: ${errorData.errorMessage || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to initiate C2B payment:', error);
      throw error;
    }
  }

  async disburseB2C(params: {
    amount: number;
    phoneNumber: string;
    commandId: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment';
    remarks: string;
    occassion: string;
  }): Promise<B2CResponse> {
    const token = await this.getAccessToken();

    const payload = {
      OriginatorConversationID: `JECRIBUREAU-${Date.now()}`,
      InitiatorName: 'JECRI BUREAU',
      SecurityCredential: Buffer.from(this.config.consumerSecret).toString(
        'base64'
      ),
      CommandID: params.commandId,
      Amount: Math.floor(params.amount),
      PartyA: this.config.businessShortCode,
      PartyB: params.phoneNumber,
      Remarks: params.remarks,
      QueueTimeOutURL: this.config.callbackUrl,
      ResultURL: this.config.callbackUrl,
      Occasion: params.occassion,
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/mpesa/b2c/v1/payrequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `B2C request failed: ${errorData.errorMessage || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to disburse B2C payment:', error);
      throw error;
    }
  }

  async checkTransactionStatus(params: {
    checkoutRequestId: string;
  }): Promise<TransactionStatus> {
    const token = await this.getAccessToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:-]/g, '')
      .slice(0, 14);
    const password = Buffer.from(
      `${this.config.businessShortCode}${this.config.passkey}${timestamp}`
    ).toString('base64');

    const payload = {
      BusinessShortCode: this.config.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: params.checkoutRequestId,
    };

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      return {
        status:
          data.ResponseCode === '0'
            ? 'COMPLETED'
            : data.ResponseCode === '1' || data.ResponseCode === '2'
            ? 'FAILED'
            : 'PENDING',
        amount: data.ResponseMetadata?.Amount || 0,
        reference: data.ResponseMetadata?.MpesaReceiptNumber || '',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to check transaction status:', error);
      throw error;
    }
  }
}

export { MpesaClient };
export type { DarajaConfig, C2BResponse, B2CResponse, TransactionStatus };
