import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { 
  SchoolSearchResult, 
  StudentInfo, 
  ParentInfo, 
  PaymentRequest, 
  SupportTicketRequest, 
  CallbackRequest 
} from '../agents/frontdesk/types.js';
import EmailService from './email.service.js';
import SupportTicketService from './supportTicket.service.js';

export class FrontDeskService {
  private app: FastifyInstance;
  private prisma: PrismaClient;
  private emailService: EmailService;
  private supportTicketService: SupportTicketService;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.prisma = new PrismaClient();
    this.emailService = new EmailService(app);
    this.supportTicketService = new SupportTicketService(app);
  }

  async searchSchool(schoolName: string): Promise<SchoolSearchResult | null> {
    try {
      const school = await this.prisma.school.findFirst({
        where: {
          OR: [
            { name: { contains: schoolName, mode: 'insensitive' } },
            { shortName: { contains: schoolName, mode: 'insensitive' } }
          ],
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          shortName: true,
          email: true,
          phone: true,
          address: true,
          state: true,
          lga: true,
          country: true,
          status: true
        }
      });

      if (!school) return null;

      // Transform to match SchoolSearchResult interface
      return {
        id: school.id,
        name: school.name,
        shortName: school.shortName,
        email: school.email,
        phone: school.phone || undefined,
        address: school.address || undefined,
        state: school.state || undefined,
        lga: school.lga || undefined,
        country: school.country || undefined,
        status: school.status,
        website: undefined // Add if needed
      };
    } catch (error: any) {
      this.app.log.error('Error searching for school:', error);
      throw error as any;
    }
  }

  async getStudentInfo(studentName: string, className: string, classArm?: string): Promise<StudentInfo | null> {
    try {
      const student = await this.prisma.student.findFirst({
        where: {
          OR: [
            { firstName: { contains: studentName, mode: 'insensitive' } },
            { lastName: { contains: studentName, mode: 'insensitive' } }
          ],
          class: {
            name: { contains: className, mode: 'insensitive' }
          },
          ...(classArm && {
            classArm: {
              name: { contains: classArm, mode: 'insensitive' }
            }
          }),
          status: 'ACTIVE'
        },
        include: {
          class: true,
          classArm: true,
          parent: true
        }
      });

      if (!student) return null;

      // Get parent email for payment processing
      let parentEmail: string | undefined;
      if (student.parentId) {
        const parent = await this.prisma.parent.findUnique({
          where: { id: student.parentId },
          select: { email: true }
        });
        parentEmail = parent?.email;
      }

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        otherName: student.otherName || undefined,
        classId: student.classId,
        className: student.class.name,
        classArmId: student.classArmId || undefined,
        classArmName: student.classArm?.name || undefined,
        parentId: student.parentId || '',
        parentEmail,
        status: student.status
      };
    } catch (error: any) {
      this.app.log.error('Error getting student info:', error);
      throw error as any;
    }
  }

  async getParentInfo(parentId: string): Promise<ParentInfo | null> {
    try {
      const parent = await this.prisma.parent.findUnique({
        where: { id: parentId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true
        }
      });

      return parent;
    } catch (error: any) {
      this.app.log.error('Error getting parent info:', error);
      throw error as any;
    }
  }

  async generatePaymentLink(paymentData: PaymentRequest): Promise<string> {
    try {
      // Generate a unique payment link
      const paymentId = crypto.randomUUID();
      const baseUrl = process.env.PAYMENT_BASE_URL || 'https://payments.flexdesk.com';
      
      const paymentLink = `${baseUrl}/pay/${paymentId}`;
      
      // Store payment request in database
      await this.prisma.$executeRaw`
        INSERT INTO payment_requests (
          id, student_id, amount, description, parent_email, 
          currency, due_date, status, created_at
        ) VALUES (
          ${paymentId},
          ${paymentData.studentId},
          ${paymentData.amount},
          ${paymentData.description},
          ${paymentData.parentEmail},
          ${paymentData.currency || 'NGN'},
          ${paymentData.dueDate || null},
          'PENDING',
          NOW()
        );
      `;

      this.app.log.info(`Payment link generated: ${paymentId} for student ${paymentData.studentId}`);
      return paymentLink;
    } catch (error: any) {
      this.app.log.error('Error generating payment link:', error);
      throw error as any;
    }
  }

  async sendPaymentEmail(parentEmail: string, paymentLink: string, studentInfo: StudentInfo): Promise<void> {
    try {
      // Create HTML content for the email
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">School Fee Payment Request</h2>
          <p>Dear Parent/Guardian,</p>
          <p>This is a request for payment of school fees for:</p>
          <ul>
            <li><strong>Student Name:</strong> ${studentInfo.firstName} ${studentInfo.lastName}</li>
            <li><strong>Class:</strong> ${studentInfo.className} ${studentInfo.classArmName || ''}</li>
          </ul>
          <p>Please click the link below to complete your payment:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Pay School Fees
            </a>
          </p>
          <p>If you have any questions, please contact the school administration.</p>
          <p>Thank you for your prompt attention to this matter.</p>
        </div>
      `;

      // Send the payment email using the EmailService
      await this.emailService.sendPaymentEmail(
        parentEmail, 
        'School Fee Payment Link', 
        htmlContent
      );
      
      this.app.log.info(`Payment email sent to ${parentEmail}`);
      
    } catch (error: any) {
      this.app.log.error('Error sending payment email:', error);
      throw error as any;
    }
  }

  async createSupportTicket(ticketData: any): Promise<any> {
    try {
      // Create a simple support ticket record in the database
      const ticketId = crypto.randomUUID();
      
      await this.prisma.$executeRaw`
        INSERT INTO support_tickets (
          id, issue, priority, caller_phone, status, created_at
        ) VALUES (
          ${ticketId},
          ${ticketData.issue || 'General inquiry'},
          ${ticketData.priority || 'MEDIUM'},
          ${ticketData.callerPhone || 'Unknown'},
          'PENDING',
          NOW()
        );
      `;

      this.app.log.info(`Support ticket created: ${ticketId}`);
      return { id: ticketId, status: 'PENDING' };
    } catch (error: any) {
      this.app.log.error('Error creating support ticket:', error);
      throw error as any;
    }
  }

  async scheduleCallback(callbackData: CallbackRequest): Promise<void> {
    try {
      // Create a scheduled callback record
      await this.prisma.$executeRaw`
        INSERT INTO scheduled_callbacks (
          id, ticket_id, phone_number, preferred_time, 
          description, priority, status, created_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${callbackData.ticketId},
          ${callbackData.phoneNumber},
          ${callbackData.preferredTime},
          ${callbackData.description},
          ${callbackData.priority || 'MEDIUM'},
          'SCHEDULED',
          NOW()
        );
      `;

      this.app.log.info(`Callback scheduled for ticket: ${callbackData.ticketId}`);
    } catch (error: any) {
      this.app.log.error('Error scheduling callback:', error);
      throw error as any;
    }
  }

  async logOutgoingCall(callData: any, result: any): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO outgoing_call_logs (
          id, call_id, target_phone, purpose, result, 
          timestamp, metadata, created_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${callData.id},
          ${callData.callerInfo.phoneNumber},
          ${callData.userQuery},
          ${JSON.stringify(result)},
          NOW(),
          ${JSON.stringify(callData.metadata || {})},
          NOW()
        );
      `;

      this.app.log.info(`Outgoing call logged: ${callData.id}`);
    } catch (error: any) {
      this.app.log.error('Error logging outgoing call:', error);
    }
  }

  async getSchoolDetails(schoolId: string): Promise<any> {
    try {
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
        include: {
          classes: {
            include: {
              classArms: true,
              subjects: true
            }
          },
          staff: {
            include: {
              profile: true,
              role: true
            }
          },
          terms: true
        }
      });

      return school;
    } catch (error: any) {
      this.app.log.error('Error getting school details:', error);
      throw error as any;
    }
  }

  async getStudentPaymentHistory(studentId: string): Promise<any[]> {
    try {
      const payments = await this.prisma.$queryRaw`
        SELECT * FROM payment_requests 
        WHERE student_id = ${studentId}
        ORDER BY created_at DESC;
      `;

      return payments as any[];
    } catch (error: any) {
      this.app.log.error('Error getting student payment history:', error);
      return [];
    }
  }

  async updateParentEmail(parentId: string, newEmail: string): Promise<void> {
    try {
      await this.prisma.parent.update({
        where: { id: parentId },
        data: { email: newEmail }
      });

      this.app.log.info(`Parent email updated: ${parentId} -> ${newEmail}`);
    } catch (error: any) {
      this.app.log.error('Error updating parent email:', error);
      throw error as any;
    }
  }

  async getActiveSupportTickets(phoneNumber: string): Promise<any[]> {
    try {
      const tickets = await this.prisma.supportTicket.findMany({
        where: {
          phone: phoneNumber,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      return tickets;
    } catch (error: any) {
      this.app.log.error('Error getting active support tickets:', error);
      return [];
    }
  }

  async createPaymentTables(): Promise<void> {
    try {
      // Create payment requests table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS payment_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id VARCHAR(100) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          description TEXT NOT NULL,
          parent_email VARCHAR(100) NOT NULL,
          currency VARCHAR(3) DEFAULT 'NGN',
          due_date TIMESTAMP,
          status VARCHAR(50) DEFAULT 'PENDING',
          payment_link VARCHAR(500),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Create support tickets table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          issue TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'MEDIUM',
          caller_phone VARCHAR(20),
          status VARCHAR(50) DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Create scheduled callbacks table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS scheduled_callbacks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id UUID NOT NULL,
          phone_number VARCHAR(20) NOT NULL,
          preferred_time TIMESTAMP NOT NULL,
          description TEXT,
          priority VARCHAR(20) DEFAULT 'MEDIUM',
          status VARCHAR(50) DEFAULT 'SCHEDULED',
          executed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Create outgoing call logs table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS outgoing_call_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          call_id VARCHAR(100) NOT NULL,
          target_phone VARCHAR(20) NOT NULL,
          purpose TEXT,
          result JSONB,
          timestamp TIMESTAMP DEFAULT NOW(),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Create indexes
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_payment_requests_student_id ON payment_requests(student_id);
        CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_caller_phone ON support_tickets(caller_phone);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
        CREATE INDEX IF NOT EXISTS idx_scheduled_callbacks_ticket_id ON scheduled_callbacks(ticket_id);
        CREATE INDEX IF NOT EXISTS idx_scheduled_callbacks_status ON scheduled_callbacks(status);
        CREATE INDEX IF NOT EXISTS idx_outgoing_call_logs_call_id ON outgoing_call_logs(call_id);
      `;

      this.app.log.info('Payment and support tables created successfully');
    } catch (error: any) {
      this.app.log.error('Error creating payment tables:', error);
      throw error as any;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch (error: any) {
      this.app.log.error('Error during front desk service cleanup:', error);
    }
  }
} 