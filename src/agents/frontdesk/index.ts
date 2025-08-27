import { FastifyInstance } from 'fastify';
import { FrontDeskAgent } from './agent.js';
import { CallHandler } from './call-handler.js';
import { ConversationManager } from './conversation-manager.js';
import { SecurityManager } from './security-manager.js';
import { FrontDeskService } from '../../services/frontdesk.service.js';

export class FrontDeskAgentManager {
  private app: FastifyInstance;
  private agent: FrontDeskAgent;
  private callHandler: CallHandler;
  private conversationManager: ConversationManager;
  private securityManager: SecurityManager;
  private frontDeskService: FrontDeskService;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.frontDeskService = new FrontDeskService(app);
    this.securityManager = new SecurityManager(app);
    this.conversationManager = new ConversationManager(app);
    this.callHandler = new CallHandler(app, this.conversationManager, this.securityManager);
    this.agent = new FrontDeskAgent(
      app,
      this.callHandler,
      this.conversationManager,
      this.securityManager,
      this.frontDeskService
    );
  }

  async initialize(): Promise<void> {
    await this.agent.initialize();
    this.app.log.info('Front Desk AI Agent initialized successfully');
  }

  async handleIncomingCall(callData: any): Promise<any> {
    return await this.agent.handleIncomingCall(callData);
  }

  async makeOutgoingCall(callData: any): Promise<any> {
    return await this.agent.makeOutgoingCall(callData);
  }

  async getAgentStatus(): Promise<any> {
    return await this.agent.getStatus();
  }

  async updateAgentCapabilities(capabilities: any): Promise<void> {
    await this.agent.updateCapabilities(capabilities);
  }
}

export default FrontDeskAgentManager; 