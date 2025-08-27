import { FastifyInstance } from 'fastify';
import { SecurityAlert, SecurityAlertData, FraudType, SecurityLevel, CallData } from './types.js';
import { PrismaClient } from '@prisma/client';

export class SecurityManager {
  private app: FastifyInstance;
  private prisma: PrismaClient;
  private isInitialized: boolean = false;
  private securityRules: Map<string, any>;
  private suspiciousPatterns: RegExp[];

  constructor(app: FastifyInstance) {
    this.app = app;
    this.prisma = new PrismaClient();
    this.securityRules = new Map();
    this.suspiciousPatterns = this.initializeSuspiciousPatterns();
  }

  async initialize(): Promise<void> {
    try {
      await this.initializeSecurityRules();
      await this.createSecurityTables();
      this.isInitialized = true;
      this.app.log.info('Security Manager initialized successfully');
    } catch (error) {
      this.app.log.error('Failed to initialize Security Manager:', error);
      throw error;
    }
  }

  private initializeSuspiciousPatterns(): RegExp[] {
    return [
      // Payment fraud patterns
      /\b(urgent|immediate|emergency)\s+(payment|transfer|deposit)\b/i,
      /\b(account|bank|credit)\s+(suspended|blocked|frozen)\b/i,
      /\b(verify|confirm|update)\s+(account|bank|personal)\s+(information|details)\b/i,
      
      // Identity theft patterns
      /\b(social\s+security|ssn|tax\s+id|driver\s+license)\s+(number|id)\b/i,
      /\b(mother's\s+maiden|father's\s+name|birth\s+place)\b/i,
      
      // Phishing patterns
      /\b(click\s+link|open\s+attachment|download\s+file)\b/i,
      /\b(verify\s+email|confirm\s+account|reset\s+password)\b/i,
      
      // Social engineering patterns
      /\b(help\s+me|urgent\s+help|family\s+emergency)\b/i,
      /\b(change\s+payment|modify\s+record|delete\s+data)\b/i,
      
      // Unauthorized access patterns
      /\b(admin|root|superuser|privileged)\s+(access|account|login)\b/i,
      /\b(bypass|override|circumvent)\s+(security|authentication|verification)\b/i
    ];
  }

  private async initializeSecurityRules(): Promise<void> {
    // Define security rules
    this.securityRules.set('payment_modification', {
      risk: 'HIGH',
      action: 'FLAG_AND_BLOCK',
      description: 'Attempt to modify payment information'
    });

    this.securityRules.set('record_deletion', {
      risk: 'CRITICAL',
      action: 'FLAG_AND_BLOCK',
      description: 'Attempt to delete records'
    });

    this.securityRules.set('admin_access', {
      risk: 'HIGH',
      action: 'FLAG_AND_ALERT',
      description: 'Request for administrative access'
    });

    this.securityRules.set('personal_info_request', {
      risk: 'MEDIUM',
      action: 'FLAG_AND_VERIFY',
      description: 'Request for personal information'
    });

    this.securityRules.set('urgent_payment', {
      risk: 'MEDIUM',
      action: 'FLAG_AND_VERIFY',
      description: 'Urgent payment request'
    });
  }

  private async createSecurityTables(): Promise<void> {
    try {
      // Create security alerts table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS security_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(100) NOT NULL,
          level VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          call_data JSONB,
          timestamp TIMESTAMP DEFAULT NOW(),
          status VARCHAR(50) DEFAULT 'OPEN',
          assigned_to VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;

      // Create fraud detection logs table
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS fraud_detection_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          call_id VARCHAR(100),
          caller_phone VARCHAR(20),
          risk_score DECIMAL(3,2),
          detected_patterns TEXT[],
          action_taken VARCHAR(100),
          timestamp TIMESTAMP DEFAULT NOW(),
          metadata JSONB
        );
      `;

      // Create indexes
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(type);
        CREATE INDEX IF NOT EXISTS idx_security_alerts_level ON security_alerts(level);
        CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
        CREATE INDEX IF NOT EXISTS idx_fraud_logs_call_id ON fraud_detection_logs(call_id);
        CREATE INDEX IF NOT EXISTS idx_fraud_logs_risk_score ON fraud_detection_logs(risk_score);
      `;

    } catch (error) {
      this.app.log.warn('Could not create security tables:', error);
    }
  }

  async validateCall(callData: CallData): Promise<{ isValid: boolean; reason?: string; ticketId?: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('Security Manager not initialized');
      }

      // Check for suspicious patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(callData.userQuery);
      
      if (suspiciousPatterns.length > 0) {
        const riskScore = this.calculateRiskScore(suspiciousPatterns, callData);
        
        if (riskScore >= 0.8) {
          // High risk - block the call
          const alert = await this.createSecurityAlert({
            type: this.determineFraudType(suspiciousPatterns),
            level: SecurityLevel.CRITICAL,
            description: `High-risk call blocked due to suspicious patterns: ${suspiciousPatterns.join(', ')}`,
            callData: callData
          });

          await this.logFraudDetection(callData, riskScore, suspiciousPatterns, 'BLOCKED');

          return {
            isValid: false,
            reason: 'Call blocked due to security concerns',
            ticketId: alert.id
          };
        } else if (riskScore >= 0.5) {
          // Medium risk - flag for review
          const alert = await this.createSecurityAlert({
            type: this.determineFraudType(suspiciousPatterns),
            level: SecurityLevel.HIGH,
            description: `Medium-risk call flagged for review: ${suspiciousPatterns.join(', ')}`,
            callData: callData
          });

          await this.logFraudDetection(callData, riskScore, suspiciousPatterns, 'FLAGGED');

          return {
            isValid: true,
            reason: 'Call flagged for security review',
            ticketId: alert.id
          };
        }
      }

      // Check caller history for suspicious activity
      const callerHistory = await this.getCallerHistory(callData.callerInfo.phoneNumber);
      if (callerHistory.suspiciousActivity > 3) {
        const alert = await this.createSecurityAlert({
          type: FraudType.SOCIAL_ENGINEERING,
          level: SecurityLevel.HIGH,
          description: `Caller with multiple suspicious activities: ${callerHistory.suspiciousActivity} incidents`,
          callData: callData
        });

        return {
          isValid: false,
          reason: 'Caller blocked due to suspicious history',
          ticketId: alert.id
        };
      }

      return { isValid: true };
    } catch (error) {
      this.app.log.error('Error validating call:', error);
      // Default to allowing the call if security check fails
      return { isValid: true, reason: 'Security check failed, allowing call' };
    }
  }

  async validateOutgoingCall(callData: CallData): Promise<{ isValid: boolean; reason?: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('Security Manager not initialized');
      }

      // Validate outgoing call parameters
      if (!callData.callerInfo.phoneNumber || !callData.userQuery) {
        return {
          isValid: false,
          reason: 'Missing required call parameters'
        };
      }

      // Check if the number is in blocked list
      const isBlocked = await this.isNumberBlocked(callData.callerInfo.phoneNumber);
      if (isBlocked) {
        return {
          isValid: false,
          reason: 'Phone number is blocked'
        };
      }

      return { isValid: true };
    } catch (error) {
      this.app.log.error('Error validating outgoing call:', error);
      return { isValid: false, reason: 'Validation failed' };
    }
  }

  async flagSuspiciousActivity(callData: CallData, reason: string): Promise<SecurityAlert> {
    try {
      if (!this.isInitialized) {
        throw new Error('Security Manager not initialized');
      }

      const alert = await this.createSecurityAlert({
        type: FraudType.SOCIAL_ENGINEERING,
        level: SecurityLevel.MEDIUM,
        description: `Suspicious activity flagged: ${reason}`,
        callData: callData
      });

      this.app.log.warn(`Suspicious activity flagged: ${reason}`, { callId: callData.id, reason });

      return alert;
    } catch (error) {
      this.app.log.error('Error flagging suspicious activity:', error);
      throw error;
    }
  }

  private detectSuspiciousPatterns(text: string): string[] {
    const detectedPatterns: string[] = [];
    
    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(text)) {
        detectedPatterns.push(`pattern_${index}`);
      }
    });

    return detectedPatterns;
  }

  private calculateRiskScore(patterns: string[], callData: CallData): number {
    let baseScore = patterns.length * 0.2;
    
    // Additional risk factors
    if (callData.userQuery.toLowerCase().includes('urgent')) baseScore += 0.1;
    if (callData.userQuery.toLowerCase().includes('emergency')) baseScore += 0.2;
    if (callData.userQuery.toLowerCase().includes('immediate')) baseScore += 0.15;
    
    // Time-based risk (calls outside business hours)
    const hour = new Date().getHours();
    if (hour < 8 || hour > 18) baseScore += 0.1;
    
    return Math.min(baseScore, 1.0);
  }

  private determineFraudType(patterns: string[]): FraudType {
    if (patterns.some(p => p.includes('payment'))) {
      return FraudType.PAYMENT_FRAUD;
    }
    if (patterns.some(p => p.includes('identity'))) {
      return FraudType.IDENTITY_THEFT;
    }
    if (patterns.some(p => p.includes('phishing'))) {
      return FraudType.PHISHING;
    }
    if (patterns.some(p => p.includes('admin'))) {
      return FraudType.UNAUTHORIZED_ACCESS;
    }
    
    return FraudType.SOCIAL_ENGINEERING;
  }

  private async createSecurityAlert(alertData: SecurityAlertData): Promise<SecurityAlert> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO security_alerts (type, level, description, call_data, timestamp)
        VALUES (${alertData.type}, ${alertData.level}, ${alertData.description}, ${JSON.stringify(alertData.callData)}, NOW())
      `;

      // Create a mock SecurityAlert object since we can't easily get the inserted data
      // In a real implementation, you might want to use a separate query to fetch the created alert
      return {
        id: crypto.randomUUID(), // Generate a new ID
        type: alertData.type,
        level: alertData.level,
        description: alertData.description,
        callData: alertData.callData,
        timestamp: new Date(),
        status: 'OPEN'
      };
    } catch (error) {
      this.app.log.error('Error creating security alert:', error);
      throw error;
    }
  }

  private async logFraudDetection(callData: CallData, riskScore: number, patterns: string[], action: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO fraud_detection_logs (call_id, caller_phone, risk_score, detected_patterns, action_taken, metadata)
        VALUES (${callData.id}, ${callData.callerInfo.phoneNumber}, ${riskScore}, ${patterns}, ${action}, ${JSON.stringify(callData.metadata)});
      `;
    } catch (error) {
      this.app.log.error('Error logging fraud detection:', error);
    }
  }

  private async getCallerHistory(phoneNumber: string): Promise<{ suspiciousActivity: number }> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as suspicious_activity
        FROM fraud_detection_logs
        WHERE caller_phone = ${phoneNumber}
        AND action_taken IN ('BLOCKED', 'FLAGGED')
        AND timestamp > NOW() - INTERVAL '30 days';
      `;

      return { suspiciousActivity: parseInt((result as any[])[0]?.suspicious_activity || '0') };
    } catch (error) {
      this.app.log.error('Error getting caller history:', error);
      return { suspiciousActivity: 0 };
    }
  }

  private async isNumberBlocked(phoneNumber: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as blocked_count
        FROM fraud_detection_logs
        WHERE caller_phone = ${phoneNumber}
        AND action_taken = 'BLOCKED'
        AND timestamp > NOW() - INTERVAL '7 days';
      `;

      return parseInt((result as any[])[0]?.blocked_count || '0') > 0;
    } catch (error) {
      this.app.log.error('Error checking if number is blocked:', error);
      return false;
    }
  }

  async getSecurityAlertsCount(): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as alert_count
        FROM security_alerts
        WHERE status = 'OPEN';
      `;

      return parseInt((result as any[])[0]?.alert_count || '0');
    } catch (error) {
      this.app.log.error('Error getting security alerts count:', error);
      return 0;
    }
  }

  async getSecurityAlerts(limit: number = 10): Promise<SecurityAlert[]> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT *
        FROM security_alerts
        ORDER BY timestamp DESC
        LIMIT ${limit};
      `;

      return result as SecurityAlert[];
    } catch (error) {
      this.app.log.error('Error getting security alerts:', error);
      return [];
    }
  }

  async updateAlertStatus(alertId: string, status: string, notes?: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        UPDATE security_alerts
        SET status = ${status}, notes = ${notes || null}, updated_at = NOW()
        WHERE id = ${alertId};
      `;
    } catch (error) {
      this.app.log.error('Error updating alert status:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isInitialized = false;
    } catch (error) {
      this.app.log.error('Error during security manager cleanup:', error);
    }
  }
} 