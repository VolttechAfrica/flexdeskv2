import { FastifyInstance } from 'fastify';
import { FrontDeskAgent } from './agent.js';

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export interface MCPCapability {
  name: string;
  description: string;
  tools: MCPTool[];
  enabled: boolean;
}

export class MCPIntegration {
  private app: FastifyInstance;
  private agent: FrontDeskAgent;
  private capabilities: Map<string, MCPCapability>;
  private tools: Map<string, MCPTool>;

  constructor(app: FastifyInstance, agent: FrontDeskAgent) {
    this.app = app;
    this.agent = agent;
    this.capabilities = new Map();
    this.tools = new Map();
  }

  async initialize(): Promise<void> {
    try {
      // Register default capabilities
      await this.registerDefaultCapabilities();
      
      // Load custom capabilities from configuration
      await this.loadCustomCapabilities();
      
      this.app.log.info('MCP Integration initialized successfully');
    } catch (error: any) {
      this.app.log.error('Failed to initialize MCP Integration:', error);
      throw error as any;
    }
  }

  private async registerDefaultCapabilities(): Promise<void> {
    // Payment Processing Capability
    const paymentCapability: MCPCapability = {
      name: 'payment_processing',
      description: 'Handle various payment-related operations',
      enabled: true,
      tools: [
        {
          name: 'process_payment',
          description: 'Process a payment for school fees',
          parameters: {
            studentId: { type: 'string', required: true },
            amount: { type: 'number', required: true },
            paymentMethod: { type: 'string', required: true }
          },
          execute: async (params) => {
            // Implementation would integrate with payment gateway
            return { success: true, transactionId: crypto.randomUUID() };
          }
        },
        {
          name: 'verify_payment',
          description: 'Verify the status of a payment',
          parameters: {
            transactionId: { type: 'string', required: true }
          },
          execute: async (params) => {
            // Implementation would check payment status
            return { status: 'completed', verified: true };
          }
        }
      ]
    };

    // Student Records Capability
    const studentRecordsCapability: MCPCapability = {
      name: 'student_records',
      description: 'Access and manage student records',
      enabled: true,
      tools: [
        {
          name: 'get_student_record',
          description: 'Retrieve student academic record',
          parameters: {
            studentId: { type: 'string', required: true },
            includeGrades: { type: 'boolean', required: false }
          },
          execute: async (params) => {
            // Implementation would fetch from database
            return { studentId: params.studentId, record: 'student_data' };
          }
        },
        {
          name: 'update_student_info',
          description: 'Update student information (read-only for agent)',
          parameters: {
            studentId: { type: 'string', required: true },
            field: { type: 'string', required: true },
            value: { type: 'string', required: true }
          },
          execute: async (params) => {
            // Agent cannot modify records - only view
            throw new Error('Agent does not have permission to modify student records');
          }
        }
      ]
    };

    // Communication Capability
    const communicationCapability: MCPCapability = {
      name: 'communication',
      description: 'Handle various communication channels',
      enabled: true,
      tools: [
        {
          name: 'send_sms',
          description: 'Send SMS notification',
          parameters: {
            phoneNumber: { type: 'string', required: true },
            message: { type: 'string', required: true }
          },
          execute: async (params) => {
            // Implementation would integrate with SMS service
            return { success: true, messageId: crypto.randomUUID() };
          }
        },
        {
          name: 'send_push_notification',
          description: 'Send push notification to mobile app',
          parameters: {
            userId: { type: 'string', required: true },
            title: { type: 'string', required: true },
            body: { type: 'string', required: true }
          },
          execute: async (params) => {
            // Implementation would integrate with push notification service
            return { success: true, notificationId: crypto.randomUUID() };
          }
        }
      ]
    };

    // Analytics Capability
    const analyticsCapability: MCPCapability = {
      name: 'analytics',
      description: 'Provide insights and analytics',
      enabled: true,
      tools: [
        {
          name: 'get_call_statistics',
          description: 'Get call handling statistics',
          parameters: {
            timeRange: { type: 'string', required: false },
            schoolId: { type: 'string', required: false }
          },
          execute: async (params) => {
            // Implementation would aggregate call data
            return { totalCalls: 150, resolvedCalls: 140, pendingCalls: 10 };
          }
        },
        {
          name: 'get_payment_analytics',
          description: 'Get payment processing analytics',
          parameters: {
            timeRange: { type: 'string', required: false },
            schoolId: { type: 'string', required: false }
          },
          execute: async (params) => {
            // Implementation would aggregate payment data
            return { totalPayments: 500, totalAmount: 2500000, successRate: 0.95 };
          }
        }
      ]
    };

    // Register capabilities
    this.capabilities.set('payment_processing', paymentCapability);
    this.capabilities.set('student_records', studentRecordsCapability);
    this.capabilities.set('communication', communicationCapability);
    this.capabilities.set('analytics', analyticsCapability);

    // Register all tools
    this.registerTools(paymentCapability.tools);
    this.registerTools(studentRecordsCapability.tools);
    this.registerTools(communicationCapability.tools);
    this.registerTools(analyticsCapability.tools);
  }

  private async loadCustomCapabilities(): Promise<void> {
    try {
      // Load from environment variables or configuration files
      const customCapabilitiesConfig = process.env.CUSTOM_CAPABILITIES;
      
      if (customCapabilitiesConfig) {
        const customCapabilities = JSON.parse(customCapabilitiesConfig);
        
        for (const [name, config] of Object.entries(customCapabilities)) {
          await this.registerCustomCapability(name, config as any);
        }
      }
    } catch (error: any) {
      this.app.log.warn('Could not load custom capabilities:', error);
    }
  }

  async registerCustomCapability(name: string, config: any): Promise<void> {
    try {
      const capability: MCPCapability = {
        name,
        description: config.description || 'Custom capability',
        enabled: config.enabled !== false,
        tools: config.tools || []
      };

      this.capabilities.set(name, capability);
      this.registerTools(capability.tools);
      
      this.app.log.info(`Custom capability registered: ${name}`);
    } catch (error: any) {
      this.app.log.error(`Error registering custom capability ${name}:`, error);
    }
  }

  private registerTools(tools: MCPTool[]): void {
    tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });
  }

  async executeTool(toolName: string, parameters: any): Promise<any> {
    try {
      const tool = this.tools.get(toolName);
      
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Validate parameters
      this.validateToolParameters(tool, parameters);

      // Execute the tool
      const result = await tool.execute(parameters);
      
      // Log tool execution
      await this.logToolExecution(toolName, parameters, result);
      
      return result;
    } catch (error: any) {
      this.app.log.error(`Error executing tool ${toolName}:`, error);
      throw error as any;
    }
  }

  private validateToolParameters(tool: MCPTool, parameters: any): void {
    const requiredParams = Object.entries(tool.parameters)
      .filter(([_, config]) => (config as any).required)
      .map(([name, _]) => name);

    for (const param of requiredParams) {
      if (!(param in parameters)) {
        throw new Error(`Required parameter missing: ${param}`);
      }
    }
  }

  private async logToolExecution(toolName: string, parameters: any, result: any): Promise<void> {
    try {
      // Log to database or monitoring system
      this.app.log.info(`Tool executed: ${toolName}`, {
        parameters,
        result: result?.success ? 'success' : 'failure',
        timestamp: new Date()
      } as any);
    } catch (error: any) {
      this.app.log.warn('Could not log tool execution:', error as any);
    }
  }

  async getAvailableTools(): Promise<MCPTool[]> {
    return Array.from(this.tools.values());
  }

  async getAvailableCapabilities(): Promise<MCPCapability[]> {
    return Array.from(this.capabilities.values());
  }

  async enableCapability(capabilityName: string): Promise<void> {
    const capability = this.capabilities.get(capabilityName);
    if (capability) {
      capability.enabled = true;
      this.app.log.info(`Capability enabled: ${capabilityName}`);
    }
  }

  async disableCapability(capabilityName: string): Promise<void> {
    const capability = this.capabilities.get(capabilityName);
    if (capability) {
      capability.enabled = false;
      this.app.log.info(`Capability disabled: ${capabilityName}`);
    }
  }

  async addCustomTool(capabilityName: string, tool: MCPTool): Promise<void> {
    try {
      const capability = this.capabilities.get(capabilityName);
      if (!capability) {
        throw new Error(`Capability not found: ${capabilityName}`);
      }

      capability.tools.push(tool);
      this.tools.set(tool.name, tool);
      
      this.app.log.info(`Custom tool added: ${tool.name} to capability ${capabilityName}`);
    } catch (error: any) {
      this.app.log.error(`Error adding custom tool:`, error);
      throw error as any;
    }
  }

  async removeTool(toolName: string): Promise<void> {
    try {
      this.tools.delete(toolName);
      
      // Remove from all capabilities
      for (const capability of this.capabilities.values()) {
        capability.tools = capability.tools.filter(tool => tool.name !== toolName);
      }
      
      this.app.log.info(`Tool removed: ${toolName}`);
    } catch (error: any) {
      this.app.log.error(`Error removing tool:`, error);
      throw error as any;
    }
  }

  async getToolSchema(toolName: string): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    };
  }

  async getCapabilitySchema(capabilityName: string): Promise<any> {
    const capability = this.capabilities.get(capabilityName);
    if (!capability) {
      throw new Error(`Capability not found: ${capabilityName}`);
    }

    return {
      name: capability.name,
      description: capability.description,
      enabled: capability.enabled,
      tools: capability.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))
    };
  }

  async cleanup(): Promise<void> {
    try {
      this.capabilities.clear();
      this.tools.clear();
    } catch (error: any) {
      this.app.log.error('Error during MCP integration cleanup:', error);
    }
  }
} 