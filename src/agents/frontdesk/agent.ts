import { FastifyInstance } from 'fastify';
import { CallData, CallPurpose, CallStatus, AgentStatus, AgentCapabilities, CallPurposeAnalysis } from './types.js';
import { CallHandler } from './call-handler.js';
import { ConversationManager } from './conversation-manager.js';
import { SecurityManager } from './security-manager.js';
import { FrontDeskService } from '../../services/frontdesk.service.js';
import { RAGService } from './rag.service.js';
import { LLMService } from './llm.service.js';
import { MCPIntegration } from './mcp-integration.js';

export class FrontDeskAgent {
  private app: FastifyInstance;
  private callHandler: CallHandler;
  private conversationManager: ConversationManager;
  private securityManager: SecurityManager;
  private frontDeskService: FrontDeskService;
  private ragService: RAGService;
  private llmService: LLMService;
  private mcpIntegration: MCPIntegration;
  private isInitialized: boolean = false;
  private status: AgentStatus = AgentStatus.OFFLINE;
  private capabilities: AgentCapabilities = {
    canHandleSchoolInquiries: true,
    canProcessPayments: true,
    canCreateSupportTickets: true,
    canScheduleCallbacks: true,
    canAccessStudentRecords: false,
    canModifyRecords: false,
    canDeleteRecords: false
  };

  constructor(
    app: FastifyInstance,
    callHandler: CallHandler,
    conversationManager: ConversationManager,
    securityManager: SecurityManager,
    frontDeskService: FrontDeskService
  ) {
    this.app = app;
    this.callHandler = callHandler;
    this.conversationManager = conversationManager;
    this.securityManager = securityManager;
    this.frontDeskService = frontDeskService;
    this.ragService = new RAGService(app);
    this.llmService = new LLMService(app);
    this.mcpIntegration = new MCPIntegration(app, this);
  }

  async initialize(): Promise<void> {
    try {
      // Initialize all services
      await this.ragService.initialize();
      await this.llmService.initialize();
      await this.mcpIntegration.initialize();

      // Register MCP capabilities
      await this.registerMCPCapabilities();

      this.status = AgentStatus.ONLINE;
      this.isInitialized = true;
      this.app.log.info('Front Desk AI Agent initialized successfully');
    } catch (error) {
      this.app.log.error('Failed to initialize Front Desk AI Agent:', error);
      throw error;
    }
  }

  private async registerMCPCapabilities(): Promise<void> {
    try {
      // Register core capabilities using the MCP integration
      await this.mcpIntegration.registerCustomCapability('school_search', {
        description: 'Search for school information',
        enabled: true,
        tools: [{
          name: 'search_school',
          description: 'Search for school information',
          parameters: { schoolName: { type: 'string', required: true } },
          execute: this.searchSchool.bind(this)
        }]
      });

      await this.mcpIntegration.registerCustomCapability('student_lookup', {
        description: 'Look up student information',
        enabled: true,
        tools: [{
          name: 'lookup_student',
          description: 'Look up student information',
          parameters: { 
            studentName: { type: 'string', required: true }, 
            className: { type: 'string', required: true } 
          },
          execute: this.lookupStudent.bind(this)
        }]
      });

      await this.mcpIntegration.registerCustomCapability('payment_processing', {
        description: 'Process school fee payments',
        enabled: true,
        tools: [{
          name: 'process_payment',
          description: 'Process school fee payments',
          parameters: { 
            studentId: { type: 'string', required: true }, 
            amount: { type: 'number', required: true } 
          },
          execute: this.processPayment.bind(this)
        }]
      });

      await this.mcpIntegration.registerCustomCapability('support_ticket_creation', {
        description: 'Create support tickets',
        enabled: true,
        tools: [{
          name: 'create_support_ticket',
          description: 'Create support tickets',
          parameters: { 
            issue: { type: 'string', required: true }, 
            priority: { type: 'string', required: true } 
          },
          execute: this.createSupportTicket.bind(this)
        }]
      });

      this.app.log.info('MCP capabilities registered successfully');
    } catch (error) {
      this.app.log.error('Failed to register MCP capabilities:', error);
    }
  }

  async handleIncomingCall(callData: CallData): Promise<any> {
    try {
      if (!this.isInitialized) {
        throw new Error('Front Desk Agent not initialized');
      }

      // Log the incoming call
      await this.callHandler.handleIncomingCall(callData);

      // Check security
      const securityCheck = await this.securityManager.validateCall(callData);
      if (!securityCheck.isValid) {
        await this.handleSecurityViolation(callData, securityCheck);
        return {
          success: false,
          error: 'Security violation detected',
          securityAlert: { type: 'security_violation', reason: securityCheck.reason }
        };
      }

      // Analyze call purpose using LLM
      const purposeAnalysis = await this.llmService.analyzeCallPurpose(callData.userQuery);
      
      // Store conversation context
      await this.conversationManager.startConversation(callData.id, callData.callerInfo);
      
      // Route to appropriate handler based on purpose
      let response;
      switch (purposeAnalysis.type) {
        case CallPurpose.SCHOOL_INQUIRY:
          response = await this.handleSchoolInquiry(callData, purposeAnalysis);
          break;
        case CallPurpose.FEE_PAYMENT:
          response = await this.handleFeePayment(callData, purposeAnalysis);
          break;
        case CallPurpose.SUPPORT_REQUEST:
          response = await this.handleSupportRequest(callData, purposeAnalysis);
          break;
        default:
          response = await this.handleGeneralInquiry(callData, purposeAnalysis);
      }

      // Update call status
      await this.callHandler.updateCallStatus(callData.id, CallStatus.IN_PROGRESS);

      return {
        success: true,
        response: response.response,
        metadata: {
          queryType: purposeAnalysis.type,
          confidence: purposeAnalysis.confidence,
          entities: purposeAnalysis.entities,
          suggestedActions: response.suggestedActions,
          followUpQuestions: response.followUpQuestions
        }
      };

    } catch (error) {
      this.app.log.error('Error handling incoming call:', error);
      
      // Create support ticket for failed calls
      const ticketId = await this.createSupportTicket({
        issue: `Call handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        priority: 'HIGH',
        callerPhone: callData.callerInfo.phoneNumber
      });

      return {
        success: false,
        error: 'I encountered an issue processing your request',
        fallback: true,
        ticketId,
        message: 'I\'ve created a support ticket and our team will contact you shortly.'
      };
    }
  }

  private async handleSchoolInquiry(callData: CallData, analysis: CallPurposeAnalysis): Promise<any> {
    try {
      const schoolName = analysis.entities.schoolName || this.extractSchoolName(callData.userQuery);
      
      if (!schoolName) {
        return await this.llmService.generateGeneralResponse([], 
          "I need more information about which school you're asking about. Could you please provide the school name?");
      }

      // Search for school using RAG
      const schoolInfo = await this.frontDeskService.searchSchool(schoolName);
      
      if (!schoolInfo) {
        return await this.llmService.generateGeneralResponse([], 
          `I'm sorry, but I couldn't find information about ${schoolName} in our system. Could you please verify the school name or provide more details?`);
      }

      // Generate response using LLM with RAG context
      return await this.llmService.generateSchoolInquiryResponse(schoolInfo, callData.userQuery);

    } catch (error) {
      this.app.log.error('Error handling school inquiry:', error);
      return await this.llmService.generateGeneralResponse([], 
        "I encountered an issue while searching for school information. Let me create a support ticket for you.");
    }
  }

  private async handleFeePayment(callData: CallData, analysis: CallPurposeAnalysis): Promise<any> {
    try {
      // Extract student information
      const studentName = analysis.entities.studentName || this.extractStudentName(callData.userQuery);
      const className = analysis.entities.className || this.extractClassName(callData.userQuery);
      
      if (!studentName || !className) {
        return await this.llmService.generateGeneralResponse([], 
          "I need more information to help with your payment. Could you please provide the student's name and class?");
      }

      // Look up student information
      const studentInfo = await this.frontDeskService.getStudentInfo(studentName, className);
      
      if (!studentInfo) {
        return await this.llmService.generateGeneralResponse([], 
          `I couldn't find a student named ${studentName} in class ${className}. Could you please verify the information?`);
      }

      // Check if email exists
      if (!studentInfo.parentEmail) {
        // Create support ticket for missing email
        const ticketId = await this.createSupportTicket({
          issue: 'Parent email not found for payment processing',
          priority: 'MEDIUM',
          studentId: studentInfo.id,
          callerPhone: callData.callerInfo.phoneNumber
        });

        return await this.llmService.generateGeneralResponse([], 
          `I found ${studentInfo.firstName} ${studentInfo.lastName} in class ${className}, but I don't have an email address on file. I've created a support ticket (${ticketId}) and our team will contact you to update your email information.`);
      }

      // Generate payment link
      const paymentLink = await this.frontDeskService.generatePaymentLink({
        studentId: studentInfo.id,
        amount: 0, // Amount will be determined by the payment system
        description: `School fees for ${studentInfo.firstName} ${studentInfo.lastName}`,
        parentEmail: studentInfo.parentEmail
      });
      
      // Send email with payment link
      await this.frontDeskService.sendPaymentEmail(studentInfo.parentEmail, paymentLink, studentInfo);

      // Generate response using LLM
      return await this.llmService.generatePaymentResponse(studentInfo, { paymentLink });

    } catch (error) {
      this.app.log.error('Error handling fee payment:', error);
      return await this.llmService.generateGeneralResponse([], 
        "I encountered an issue while processing your payment request. Let me create a support ticket for you.");
    }
  }

  private async handleSupportRequest(callData: CallData, analysis: CallPurposeAnalysis): Promise<any> {
    try {
      // Create support ticket
      const ticketId = await this.createSupportTicket({
        issue: callData.userQuery,
        priority: analysis.priority || 'MEDIUM',
        callerPhone: callData.callerInfo.phoneNumber
      });

      // Generate response using LLM
      return await this.llmService.generateGeneralResponse([], 
        `I understand you need support. I've created a support ticket (${ticketId}) for you. Our team will review your request and contact you within 24 hours. Is there anything else I can help you with?`);

    } catch (error) {
      this.app.log.error('Error handling support request:', error);
      return await this.llmService.generateGeneralResponse([], 
        "I encountered an issue while creating your support ticket. Our team will contact you shortly.");
    }
  }

  private async handleGeneralInquiry(callData: CallData, analysis: CallPurposeAnalysis): Promise<any> {
    try {
      // Search RAG for relevant information
      const relevantInfo = await this.ragService.searchGeneralInformation(callData.userQuery);
      
      // Generate response using LLM with RAG context
      return await this.llmService.generateGeneralResponse(relevantInfo, callData.userQuery);

    } catch (error) {
      this.app.log.error('Error handling general inquiry:', error);
      return await this.llmService.generateGeneralResponse([], 
        "I encountered an issue while processing your inquiry. Let me create a support ticket for you.");
    }
  }

  private async handleSecurityViolation(callData: CallData, securityCheck: any): Promise<void> {
    try {
      // Log security violation
      await this.securityManager.flagSuspiciousActivity(callData, securityCheck.reason);
      
      // Create high-priority support ticket
      await this.createSupportTicket({
        issue: `Security violation detected: ${securityCheck.reason}`,
        priority: 'HIGH',
        callerPhone: callData.callerInfo.phoneNumber,
        securityAlert: { type: 'security_violation', reason: securityCheck.reason }
      });

      this.app.log.warn(`Security violation handled for call ${callData.id}`);
    } catch (error) {
      this.app.log.error('Error handling security violation:', error);
    }
  }

  private async searchSchool(schoolName: string): Promise<any> {
    return await this.frontDeskService.searchSchool(schoolName);
  }

  private async lookupStudent(studentName: string, className: string): Promise<any> {
    return await this.frontDeskService.getStudentInfo(studentName, className);
  }

  private async processPayment(studentId: string, amount: number): Promise<any> {
    return await this.frontDeskService.generatePaymentLink({
      studentId,
      amount,
      description: 'School fee payment',
      parentEmail: 'temp@example.com' // This will be replaced with actual email
    });
  }

  private async createSupportTicket(data: any): Promise<string> {
    return await this.frontDeskService.createSupportTicket(data);
  }

  private extractSchoolName(query: string): string {
    // Simple extraction logic - can be enhanced with NLP
    const words = query.split(' ');
    const schoolKeywords = ['school', 'academy', 'college', 'institute'];
    
    for (let i = 0; i < words.length; i++) {
      if (schoolKeywords.includes(words[i].toLowerCase())) {
        return words.slice(0, i + 1).join(' ');
      }
    }
    
    return '';
  }

  private extractStudentName(query: string): string {
    // Simple extraction logic - can be enhanced with NLP
    const words = query.split(' ');
    const nameIndicators = ['my child', 'my son', 'my daughter', 'student'];
    
    for (let i = 0; i < words.length; i++) {
      if (nameIndicators.includes(words[i].toLowerCase())) {
        return words.slice(i + 1, i + 3).join(' '); // Assume next 2 words are name
      }
    }
    
    return '';
  }

  private extractClassName(query: string): string {
    // Simple extraction logic - can be enhanced with NLP
    const words = query.split(' ');
    const classIndicators = ['class', 'grade', 'form'];
    
    for (let i = 0; i < words.length; i++) {
      if (classIndicators.includes(words[i].toLowerCase())) {
        return words.slice(i, i + 2).join(' '); // Assume class + number
      }
    }
    
    return '';
  }

  async makeOutgoingCall(callData: any): Promise<any> {
    try {
      if (!this.isInitialized) {
        throw new Error('Front Desk Agent not initialized');
      }

      // Validate outgoing call
      const securityCheck = await this.securityManager.validateOutgoingCall(callData);
      if (!securityCheck.isValid) {
        throw new Error('Outgoing call not authorized');
      }

      // Process outgoing call
      const result = await this.callHandler.makeOutgoingCall(callData);
      
      // Update status
      this.status = AgentStatus.BUSY;
      
      return result;
    } catch (error) {
      this.app.log.error('Error making outgoing call:', error);
      throw error;
    }
  }

  async getStatus(): Promise<AgentStatus> {
    return this.status;
  }

  async updateCapabilities(capabilities: Partial<AgentCapabilities>): Promise<void> {
    this.capabilities = { ...this.capabilities, ...capabilities };
    this.app.log.info('Agent capabilities updated');
  }

  async cleanup(): Promise<void> {
    try {
      await this.ragService.cleanup();
      await this.llmService.cleanup();
      await this.mcpIntegration.cleanup();
      
      this.status = AgentStatus.OFFLINE;
      this.isInitialized = false;
    } catch (error) {
      this.app.log.error('Error during agent cleanup:', error);
    }
  }
} 