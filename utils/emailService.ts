import nodemailer from 'nodemailer';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: SMTPConfig | null = null;

  setConfig(config: SMTPConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass
      }
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `SMTP connection failed: ${errorMsg}` };
    }
  }

  async sendReceipt(
    recipientEmail: string,
    recipientName: string,
    pdfBuffer: Buffer,
    fileName: string,
    loanId: number,
    repaymentId: number
  ): Promise<{ success: boolean; message: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: recipientEmail,
        subject: `Payment Receipt - Loan #${loanId}`,
        html: `
          <p>Dear ${recipientName},</p>
          <p>Thank you for your payment. Please find attached your payment receipt.</p>
          <p><strong>Receipt Details:</strong></p>
          <ul>
            <li>Loan ID: #${loanId}</li>
            <li>Receipt ID: #RCP-${repaymentId}</li>
          </ul>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br/>Lending System</p>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      return { success: true, message: 'Receipt email sent successfully' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Failed to send receipt: ${errorMsg}` };
    }
  }

  async sendInvoice(
    recipientEmail: string,
    recipientName: string,
    pdfBuffer: Buffer,
    fileName: string,
    loanId: number
  ): Promise<{ success: boolean; message: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: recipientEmail,
        subject: `Loan Invoice - Loan #${loanId}`,
        html: `
          <p>Dear ${recipientName},</p>
          <p>Please find attached your updated loan invoice statement.</p>
          <p><strong>Loan Details:</strong></p>
          <ul>
            <li>Loan ID: #${loanId}</li>
          </ul>
          <p>Please review the invoice and make the necessary payments as per the agreed schedule.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br/>Lending System</p>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      return { success: true, message: 'Invoice email sent successfully' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Failed to send invoice: ${errorMsg}` };
    }
  }
}

export default new EmailService();
