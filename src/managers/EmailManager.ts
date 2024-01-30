import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

const MAIL_HOST: string = process.env.MAIL_HOST ? process.env.MAIL_HOST.toString() : 'MAIL_HOST';
const MAIL_USER: string = process.env.MAIL_USER ? process.env.MAIL_USER.toString() : 'MAIL_USER';
const MAIL_PASS: string = process.env.MAIL_PASS ? process.env.MAIL_PASS.toString() : 'MAIL_PASS';
const MAIL_PORT: number = process.env.MAIL_PORT && !isNaN(parseInt(process.env.MAIL_PORT)) ? parseInt(process.env.MAIL_PORT) : 465;

export default class EmailManager {
  private email: string;
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  private subject!: string;
  private body!: string;
  private rawbody: string | null = null;

  constructor(email: string) {
    this.email = email;
    this.transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: true,
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      }
    });
  }

  public setTitle(title: string): EmailManager {
    this.subject = title;
    return this;
  }

  public setRawBody(body: string): EmailManager {
    this.rawbody = body;
    return this;
  }

  public setBody(body: string): EmailManager {
    this.body = body;
    return this;
  }

  public async send(): Promise<SMTPTransport.SentMessageInfo | null> {
    try {
      if (!this.email) {
        console.error('[Error] Sending an email requires a provided email');
        return null;
      }
      if (!this.subject) {
        console.error('[Error] Sending an email requires a provided subject');
        return null;
      }
      if (!this.body) {
        console.error('[Error] Sending an email requires a provided body');
        return null;
      }

      const response = await this.transporter.sendMail({
        from: `"LivzMC" <${MAIL_USER}>`,
        to: this.email,
        subject: this.subject,
        text: this.rawbody || '',
        html: this.body,
      });

      console.log('[Debug] Sent an email');
      console.log(this.subject);
      console.log(this.body);

      return response;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}
