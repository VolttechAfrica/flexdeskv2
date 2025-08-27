export enum CallPurpose {
  SCHOOL_INQUIRY = 'SCHOOL_INQUIRY',
  FEE_PAYMENT = 'FEE_PAYMENT',
  GENERAL_INQUIRY = 'GENERAL_INQUIRY',
  SUPPORT_REQUEST = 'SUPPORT_REQUEST',
  APPOINTMENT_SCHEDULING = 'APPOINTMENT_SCHEDULING',
  STUDENT_RECORD_ACCESS = 'STUDENT_RECORD_ACCESS',
  PAYMENT_VERIFICATION = 'PAYMENT_VERIFICATION'
}

export enum CallStatus {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SCHEDULED = 'SCHEDULED'
}

export enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum FraudType {
  PAYMENT_FRAUD = 'PAYMENT_FRAUD',
  IDENTITY_THEFT = 'IDENTITY_THEFT',
  PHISHING = 'PHISHING',
  SOCIAL_ENGINEERING = 'SOCIAL_ENGINEERING',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS'
}

export enum AgentStatus {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  BUSY = 'BUSY',
  MAINTENANCE = 'MAINTENANCE'
}

export interface CallerInfo {
  phoneNumber: string;
  name?: string;
  email?: string;
  preferredTime?: string;
  language?: string;
  location?: string;
}

export interface CallData {
  id: string;
  status: CallStatus;
  callerInfo: CallerInfo;
  userQuery: string;
  timestamp: Date;
  duration?: number;
  recordingUrl?: string;
  metadata?: Record<string, any>;
}

export interface AgentCapabilities {
  canHandleSchoolInquiries: boolean;
  canProcessPayments: boolean;
  canCreateSupportTickets: boolean;
  canScheduleCallbacks: boolean;
  canAccessStudentRecords: boolean;
  canModifyRecords: boolean;
  canDeleteRecords: boolean;
}

export interface ConversationContext {
  id: string;
  callId: string;
  callerInfo: CallerInfo;
  conversationHistory: ConversationTurn[];
  currentState: ConversationState;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationTurn {
  id: string;
  speaker: 'AGENT' | 'USER';
  message: string;
  timestamp: Date;
  intent?: string;
  entities?: Record<string, any>;
  confidence?: number;
}

export interface ConversationState {
  currentStep: string;
  completedSteps: string[];
  pendingActions: string[];
  data: Record<string, any>;
}

export interface SecurityAlert {
  id: string;
  type: FraudType;
  level: SecurityLevel;
  description: string;
  callData: CallData;
  timestamp: Date;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  assignedTo?: string;
  notes?: string;
}

export interface SecurityAlertData {
  type: FraudType;
  level: SecurityLevel;
  description: string;
  callData: CallData;
}

export interface PaymentRequest {
  studentId: string;
  amount: number;
  description: string;
  parentEmail: string;
  currency?: string;
  dueDate?: Date;
}

export interface SupportTicketRequest {
  type: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  studentId?: string;
  parentId?: string;
  callerInfo?: CallerInfo;
  category?: string;
}

export interface CallbackRequest {
  ticketId: string;
  phoneNumber: string;
  preferredTime: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SchoolSearchResult {
  id: string;
  name: string;
  shortName: string;
  email: string;
  phone?: string;
  address?: string;
  state?: string;
  lga?: string;
  country?: string;
  status: string;
  website?: string;
}

export interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  otherName?: string;
  classId: string;
  className: string;
  classArmId?: string;
  classArmName?: string;
  parentId: string;
  parentEmail?: string;
  status: string;
}

export interface ParentInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
}

export interface RAGSearchResult {
  content: string;
  source: string;
  relevance: number;
  metadata: Record<string, any>;
}

export interface LLMResponse {
  response: string;
  confidence: number;
  suggestedActions: string[];
  followUpQuestions: string[];
  metadata: Record<string, any>;
}

export interface CallPurposeAnalysis {
  type: CallPurpose;
  confidence: number;
  entities: Record<string, any>;
  requiresCallback: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  schoolName?: string;
  studentName?: string;
  className?: string;
  classArm?: string;
  amount?: number;
} 