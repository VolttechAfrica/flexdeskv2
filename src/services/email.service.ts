import { FastifyInstance } from "fastify";
import env from "../config/env.js";
import welcomeEmail from "../utils/emailboilerplate/welcome.js";
import { UserError } from "../utils/errorhandler.js";
import { HttpStatusCode } from "axios";
import { Transporter } from "nodemailer";

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

interface WelcomeEmailData {
    to: string;
    name: string;
    temporaryPassword: string;
}

class EmailService {
    private readonly transporter: Transporter;
    private readonly from: string;

    constructor(app: FastifyInstance) {
        if (!app.transporter) {
            throw new Error("Email transporter not initialized");
        }
        this.transporter = app.transporter;
        this.from = `"Flexdesk" <${env.email.user}>`;
    }

    private async sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
        try {
            const mailOptions = {
                from: this.from,
                to,
                subject,
                html,
            };

            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            throw new UserError(
                HttpStatusCode.InternalServerError,
                `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async sendWelcomeEmail({ to, name, temporaryPassword }: WelcomeEmailData): Promise<boolean> {
        const subject = "Welcome to Flexdesk";
        const html = welcomeEmail
            .replace("{username}", name)
            .replace("{email}", to)
            .replace("{temporaryPassword}", temporaryPassword);

        return await this.sendEmail({ to, subject, html });
    }
}

export default EmailService;