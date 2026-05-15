/**
 * SMS Gateway Integration
 * Supports Africa's Talking and Twilio
 */

type SMSProvider = 'africas-talking' | 'twilio';

interface SMSConfig {
  provider: SMSProvider;
  africasTalkingKey?: string;
  africasTalkingUsername?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
}

interface SMSMessage {
  to: string;
  message: string;
  reference?: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSClient {
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
  }

  async sendSMS(params: SMSMessage): Promise<SMSResponse> {
    if (this.config.provider === 'africas-talking') {
      return this.sendViaAfricastalking(params);
    } else if (this.config.provider === 'twilio') {
      return this.sendViaTwilio(params);
    }
    return { success: false, error: 'Invalid SMS provider' };
  }

  private async sendViaAfricastalking(params: SMSMessage): Promise<SMSResponse> {
    if (!this.config.africasTalkingKey || !this.config.africasTalkingUsername) {
      return {
        success: false,
        error: 'Africa\'s Talking credentials not configured',
      };
    }

    try {
      const response = await fetch('https://api.sandbox.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          apiKey: this.config.africasTalkingKey,
        },
        body: new URLSearchParams({
          username: this.config.africasTalkingUsername,
          to: params.to,
          message: params.message,
          bulkSMSMode: '1',
        }).toString(),
      });

      const data: any = await response.json();

      if (data.SMSMessageData?.Recipients?.[0]?.statusCode === '0') {
        return {
          success: true,
          messageId: data.SMSMessageData.Recipients[0].messageId,
        };
      }

      return {
        success: false,
        error: data.SMSMessageData?.Recipients?.[0]?.status || 'Failed to send SMS',
      };
    } catch (error) {
      console.error('Africa\'s Talking SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS send failed',
      };
    }
  }

  private async sendViaTwilio(params: SMSMessage): Promise<SMSResponse> {
    if (!this.config.twilioAccountSid || !this.config.twilioAuthToken) {
      return {
        success: false,
        error: 'Twilio credentials not configured',
      };
    }

    try {
      const auth = Buffer.from(
        `${this.config.twilioAccountSid}:${this.config.twilioAuthToken}`
      ).toString('base64');

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: this.config.twilioFromNumber || '+1234567890',
            To: params.to,
            Body: params.message,
          }).toString(),
        }
      );

      const data: any = await response.json();

      if (data.sid) {
        return {
          success: true,
          messageId: data.sid,
        };
      }

      return {
        success: false,
        error: data.message || 'Failed to send SMS',
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS send failed',
      };
    }
  }
}

// SMS notification templates
const NotificationTemplates = {
  loanApproved: (borrowerName: string, loanAmount: number) =>
    `Hi ${borrowerName}, your loan application for KES ${loanAmount.toLocaleString()} has been approved! Check your dashboard for details. - LendHub`,

  loanDisbursed: (borrowerName: string, loanAmount: number) =>
    `Hi ${borrowerName}, KES ${loanAmount.toLocaleString()} has been disbursed to your account. Repayment begins on the date shown in your agreement. - LendHub`,

  repaymentDue: (borrowerName: string, dueAmount: number, dueDate: string) =>
    `Hi ${borrowerName}, your loan repayment of KES ${dueAmount.toLocaleString()} is due on ${dueDate}. Pay now via M-Pesa to avoid penalties. - LendHub`,

  paymentReceived: (borrowerName: string, paidAmount: number, balance: number) =>
    `Hi ${borrowerName}, we received your payment of KES ${paidAmount.toLocaleString()}. Outstanding balance: KES ${balance.toLocaleString()}. - LendHub`,

  paymentOverdue: (borrowerName: string, daysOverdue: number, overdueAmount: number) =>
    `Hi ${borrowerName}, your payment is ${daysOverdue} day(s) overdue. Amount due: KES ${overdueAmount.toLocaleString()}. Please pay immediately to avoid further penalties. - LendHub`,

  loanRejected: (borrowerName: string) =>
    `Hi ${borrowerName}, we regret to inform you that your loan application was not approved at this time. Contact us for feedback. - LendHub`,

  loanCompleted: (borrowerName: string) =>
    `Hi ${borrowerName}, congratulations! You have successfully completed your loan repayment. Thank you for your business. - LendHub`,
};

export { SMSClient, NotificationTemplates };
export type { SMSConfig, SMSMessage, SMSResponse, SMSProvider };
