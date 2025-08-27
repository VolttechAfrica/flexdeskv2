import { FastifyInstance } from 'fastify';
import { LLMResponse, CallPurposeAnalysis, CallPurpose } from './types.js';
import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

export class LLMService {
  private app: FastifyInstance;
  private isInitialized: boolean = false;
  private modelProvider: string;
  private apiKey: string;
  private baseUrl: string;
  private llm: BaseChatModel | null = null;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.modelProvider = process.env.LLM_PROVIDER || 'openai';
    this.apiKey = process.env.LLM_API_KEY || '';
    this.baseUrl = process.env.LLM_BASE_URL || '';
  }

  async initialize(): Promise<void> {
    try {
      if (!this.apiKey) {
        this.app.log.warn('LLM API key not provided. Using fallback responses.');
      } else {
        await this.initializeLangChainModel();
      }

      this.isInitialized = true;
      this.app.log.info(`LLM Service initialized with provider: ${this.modelProvider}`);
    } catch (error) {
      this.app.log.error('Failed to initialize LLM Service:', error);
      throw error;
    }
  }

  private async initializeLangChainModel(): Promise<void> {
    try {
      if (this.modelProvider.toLowerCase() === 'openai') {
        this.llm = new ChatOpenAI({
          apiKey: this.apiKey,
          model: process.env.OPENAI_MODEL || 'gpt-4',
          temperature: 0.7,
          maxTokens: 500
        });
        this.app.log.info('LangChain OpenAI model initialized successfully');
      } else {
        this.app.log.warn(`LLM provider ${this.modelProvider} not fully supported yet. Using fallback responses.`);
      }
    } catch (error) {
      this.app.log.error(`Failed to initialize LangChain ${this.modelProvider} model:`, error);
      throw error;
    }
  }

  async generateDynamicGreeting(): Promise<string> {
    try {
      if (!this.isInitialized) {
        throw new Error('LLM Service not initialized');
      }

      if (!this.llm) {
        return this.getRandomFallbackGreeting();
      }

      const prompt = PromptTemplate.fromTemplate(`
        You are a friendly, professional AI front desk assistant for a school management system.
        
        Generate a warm, welcoming greeting for incoming callers. The greeting should be:
        - Friendly and welcoming
        - Professional but not robotic
        - Natural and conversational
        - Brief (1-2 sentences)
        - Include that you're an AI assistant ready to help
        
        Make it sound like a real person would greet someone, not like a script.
        
        Generate the greeting:
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser()
      ]);

      const response = await chain.invoke({});
      return response.trim();
    } catch (error) {
      this.app.log.error('Error generating dynamic greeting:', error);
      return this.getRandomFallbackGreeting();
    }
  }

  async analyzeCallPurpose(userQuery: string): Promise<CallPurposeAnalysis> {
    try {
      if (!this.isInitialized) {
        throw new Error('LLM Service not initialized');
      }

      if (!this.llm) {
        return this.fallbackCallPurposeAnalysis(userQuery);
      }

      // Create prompt template using LangChain
      const prompt = PromptTemplate.fromTemplate(`
        Analyze the following user query and determine the call purpose:
        
        User Query: "{userQuery}"
        
        Please classify this into one of the following categories:
        - SCHOOL_INQUIRY: Questions about a specific school
        - FEE_PAYMENT: Payment-related inquiries
        - GENERAL_INQUIRY: General questions about the system
        - SUPPORT_REQUEST: Technical or support issues
        - APPOINTMENT_SCHEDULING: Scheduling requests
        - STUDENT_RECORD_ACCESS: Access to student records
        - PAYMENT_VERIFICATION: Payment verification requests
        
        Also extract any relevant entities like:
        - School name
        - Student name
        - Class name
        - Class arm
        - Amount
        - Priority level
        
        Respond in JSON format with the analysis.
      `);

      // Create the chain using LangChain
      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser()
      ]);

      const response = await chain.invoke({ userQuery });

      // Parse the response to extract purpose and entities
      const analysis = this.parseCallPurposeResponse(response);
      return analysis;
    } catch (error) {
      this.app.log.error('Error analyzing call purpose:', error);
      // Fallback to keyword-based analysis
      return this.fallbackCallPurposeAnalysis(userQuery);
    }
  }

  async generateSchoolInquiryResponse(schoolInfo: any, userQuery: string): Promise<LLMResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('LLM Service not initialized');
      }

      if (!this.llm) {
        return this.generateFallbackResponse(userQuery, 'school_inquiry');
      }

      const prompt = PromptTemplate.fromTemplate(`
        You are a friendly, professional front desk assistant. A caller is asking about a school with the following information:
        
        School: {schoolName}
        Location: {location}
        Phone: {phone}
        Website: {website}
        
        User Query: "{userQuery}"
        
        Provide a helpful, natural response that addresses their inquiry. Be:
        - Conversational and human-like
        - Informative but concise
        - Professional yet warm
        - Helpful and engaging
        
        Make it sound like a real person talking, not like reading from a script.
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser()
      ]);

      const response = await chain.invoke({
        schoolName: schoolInfo.name,
        location: `${schoolInfo.state}, ${schoolInfo.lga}`,
        phone: schoolInfo.phone || 'Not available',
        website: schoolInfo.website || 'Not available',
        userQuery
      });

      return {
        response: response,
        confidence: 0.9,
        suggestedActions: ['Provide school details', 'Answer specific questions', 'Offer to connect caller'],
        followUpQuestions: ['Do you need more specific information?', 'Would you like to speak with someone?'],
        metadata: { schoolId: schoolInfo.id, queryType: 'school_inquiry' }
      };
    } catch (error) {
      this.app.log.error('Error generating school inquiry response:', error);
      return this.generateFallbackResponse(userQuery, 'school_inquiry');
    }
  }

  async generateGeneralResponse(relevantInfo: any[], userQuery: string): Promise<LLMResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('LLM Service not initialized');
      }

      if (!this.llm) {
        return this.generateFallbackResponse(userQuery, 'general_inquiry');
      }

      const prompt = PromptTemplate.fromTemplate(`
        You are a friendly, professional front desk assistant. A caller has the following question:
        
        User Query: "{userQuery}"
        
        Relevant Information Available:
        {relevantInfo}
        
        Provide a helpful, natural response based on the available information. Be:
        - Conversational and human-like
        - Helpful and informative
        - Professional yet warm
        - Natural in your language
        
        If you need more details, ask clarifying questions in a friendly way.
        Make it sound like a real person talking, not like reading from a script.
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser()
      ]);

      const relevantInfoText = relevantInfo.map(info => `- ${info.content}`).join('\n');
      const response = await chain.invoke({
        userQuery,
        relevantInfo: relevantInfoText
      });

      return {
        response: response,
        confidence: 0.8,
        suggestedActions: ['Provide information', 'Ask clarifying questions', 'Create support ticket'],
        followUpQuestions: ['Is there anything else I can help you with?', 'Do you need more details?'],
        metadata: { queryType: 'general_inquiry', relevantSources: relevantInfo.length }
      };
    } catch (error) {
      this.app.log.error('Error generating general response:', error);
      return this.generateFallbackResponse(userQuery, 'general_inquiry');
    }
  }

  async generatePaymentResponse(studentInfo: any, paymentDetails: any): Promise<LLMResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('LLM Service not initialized');
      }

      if (!this.llm) {
        return this.generateFallbackResponse('payment inquiry', 'payment');
      }

      const prompt = PromptTemplate.fromTemplate(`
        You are a friendly, professional front desk assistant handling a payment inquiry:
        
        Student: {studentName}
        Class: {className}
        Payment Details: {paymentDetails}
        
        Provide a professional, reassuring response confirming the payment process and next steps. Be:
        - Clear and helpful
        - Professional yet warm
        - Reassuring about the process
        - Natural and conversational
        
        Make it sound like a real person talking, not like reading from a script.
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser()
      ]);

      const response = await chain.invoke({
        studentName: `${studentInfo.firstName} ${studentInfo.lastName}`,
        className: `${studentInfo.className} ${studentInfo.classArmName || ''}`,
        paymentDetails: JSON.stringify(paymentDetails)
      });

      return {
        response: response,
        confidence: 0.95,
        suggestedActions: ['Generate payment link', 'Send confirmation email', 'Schedule follow-up'],
        followUpQuestions: ['Do you need a receipt?', 'When would you like to make the payment?'],
        metadata: { studentId: studentInfo.id, paymentType: 'school_fees' }
      };
    } catch (error) {
      this.app.log.error('Error generating payment response:', error);
      return this.generateFallbackResponse('payment inquiry', 'payment');
    }
  }

  async generateFraudAlertResponse(alertData: any): Promise<LLMResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('LLM Service not initialized');
      }

      if (!this.llm) {
        return this.generateFallbackResponse('fraud alert', 'security');
      }

      const prompt = PromptTemplate.fromTemplate(`
        You are a professional front desk assistant detecting suspicious activity:
        
        Alert Data: {alertData}
        
        Generate a response that flags this activity and explains the security measures in place. Be:
        - Professional and firm
        - Clear about security protocols
        - Calm and reassuring
        - Natural in your language
        
        Make it sound like a real person talking, not like reading from a script.
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.llm,
        new StringOutputParser()
      ]);

      const response = await chain.invoke({
        alertData: JSON.stringify(alertData)
      });

      return {
        response: response,
        confidence: 0.99,
        suggestedActions: ['Flag caller', 'Create security ticket', 'Notify authorities'],
        followUpQuestions: [],
        metadata: { alertType: 'fraud', severity: 'high' }
      };
    } catch (error) {
      this.app.log.error('Error generating fraud alert response:', error);
      return this.generateFallbackResponse('fraud alert', 'security');
    }
  }

  private parseCallPurposeResponse(response: string): CallPurposeAnalysis {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response);
      return {
        type: parsed.type || CallPurpose.GENERAL_INQUIRY,
        confidence: parsed.confidence || 0.8,
        entities: parsed.entities || {},
        requiresCallback: parsed.requiresCallback || false,
        priority: parsed.priority || 'MEDIUM',
        schoolName: parsed.schoolName,
        studentName: parsed.studentName,
        className: parsed.className,
        classArm: parsed.classArm,
        amount: parsed.amount
      };
    } catch (error) {
      // Fallback parsing
      return this.fallbackCallPurposeAnalysis(response);
    }
  }

  private fallbackCallPurposeAnalysis(userQuery: string): CallPurposeAnalysis {
    const query = userQuery.toLowerCase();
    
    if (query.includes('school') || query.includes('academy') || query.includes('college')) {
      return {
        type: CallPurpose.SCHOOL_INQUIRY,
        confidence: 0.7,
        entities: { schoolName: this.extractSchoolName(query) },
        requiresCallback: false,
        priority: 'MEDIUM'
      };
    }
    
    if (query.includes('pay') || query.includes('fee') || query.includes('payment')) {
      return {
        type: CallPurpose.FEE_PAYMENT,
        confidence: 0.8,
        entities: {},
        requiresCallback: false,
        priority: 'HIGH'
      };
    }
    
    if (query.includes('help') || query.includes('support') || query.includes('issue')) {
      return {
        type: CallPurpose.SUPPORT_REQUEST,
        confidence: 0.7,
        entities: {},
        requiresCallback: true,
        priority: 'MEDIUM'
      };
    }
    
    return {
      type: CallPurpose.GENERAL_INQUIRY,
      confidence: 0.6,
      entities: {},
      requiresCallback: false,
      priority: 'LOW'
    };
  }

  private extractSchoolName(query: string): string {
    // Simple extraction logic
    const words = query.split(' ');
    const schoolKeywords = ['school', 'academy', 'college', 'institute'];
    
    for (let i = 0; i < words.length; i++) {
      if (schoolKeywords.includes(words[i].toLowerCase())) {
        return words.slice(0, i + 1).join(' ');
      }
    }
    
    return '';
  }

  private getRandomFallbackGreeting(): string {
    const greetings = [
      "Hello! Welcome to FlexDesk School Management System. I'm your AI assistant, ready to help with any school-related questions.",
      "Hi there! Thank you for calling FlexDesk. I'm here to assist you with school information and support.",
      "Good day! Welcome to FlexDesk. I'm your AI assistant, available 24/7 to help you.",
      "Hello and welcome! I'm here to help you with any school-related inquiries or assistance you need."
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private generateFallbackResponse(userQuery: string, type: string): LLMResponse {
    const responses = {
      school_inquiry: 'I can help you with information about our schools. Could you please provide the name of the school you\'re interested in?',
      payment: 'I can assist you with payment-related inquiries. Please provide the student\'s name and class details.',
      general_inquiry: 'I\'m here to help you. Could you please provide more details about your inquiry?',
      security: 'I\'ve detected unusual activity. For security reasons, I cannot proceed with this request.'
    };

    return {
      response: responses[type as keyof typeof responses] || 'I\'m here to help. How can I assist you today?',
      confidence: 0.5,
      suggestedActions: ['Ask for more details', 'Create support ticket'],
      followUpQuestions: ['Can you provide more information?', 'Is there anything else I can help with?'],
      metadata: { queryType: type, fallback: true }
    };
  }

  async cleanup(): Promise<void> {
    try {
      this.llm = null;
      this.isInitialized = false;
    } catch (error) {
      this.app.log.error('Error during LLM service cleanup:', error);
    }
  }
} 