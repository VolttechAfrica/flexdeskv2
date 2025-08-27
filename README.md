# 🎓 FlexDesk AI Front Desk Agent

An AI-powered web application for school administration and learning management, featuring role-based dashboards for administrators, bursars, teachers, parents, and students. The app includes authentication, protected routes, onboarding, and a marketing website.


## 🚀 Features

### **🤖 AI-Powered Intelligence**
- **Large Language Model Integration** - OpenAI GPT-4, Google Gemini, Anthropic Claude
- **Retrieval-Augmented Generation (RAG)** - PostgreSQL vector database for school information
- **Natural Language Processing** - Human-like conversation flow
- **Intent Recognition** - Automatic call purpose analysis and routing
- **Model Context Protocol (MCP)** - Extensible AI capabilities and tool integration

### **📞 Voice Call Management**
- **Twilio Integration** - Professional voice call handling
- **Call Recording** - Automatic conversation recording and storage
- **Multi-language Support** - English and extensible language support
- **Dynamic Voice Settings** - Configurable gender, speed, and language

### **🏫 School Operations**
- **School Information Lookup** - Real-time school data retrieval
- **Student Record Access** - Secure student information queries
- **Fee Payment Processing** - Automated payment link generation
- **Support Ticket Creation** - Intelligent issue tracking and resolution

### **🔒 Security & Fraud Detection**
- **Real-time Fraud Detection** - Pattern-based suspicious activity monitoring
- **Call Validation** - Phone number verification and blocking
- **Security Alerts** - Automated threat detection and reporting
- **Access Control** - Role-based permissions and restrictions

### **📊 Monitoring & Analytics**
- **Datadog Integration** - Comprehensive application monitoring
- **Call Analytics** - Performance metrics and quality monitoring
- **Conversation Insights** - AI response effectiveness tracking
- **Health Checks** - System status and readiness monitoring

### **👨‍💼 Administrator Features**
- **Anomaly Detection** - Attendance pattern analysis and payment irregularities
- **Trend Summaries** - Comprehensive data insights and reporting
- **Forecasting** - Predictive analytics for enrollment, attendance, and performance
- **System Monitoring** - Real-time dashboard and alert management

### **👩‍🏫 Teacher Features**
- **Lesson Plan Scaffolds** - AI-generated lesson structure suggestions
- **Formative Assessment Suggestions** - Personalized assessment recommendations
- **Rubric Generation** - Automated grading criteria creation
- **Content Curation** - Educational resource recommendations

### **👨‍🎓 Student Features**
- **Study Plan Recommendations** - Personalized learning path suggestions
- **Content Summarization** - AI-powered study material summaries
- **Practice Question Generation** - Adaptive quiz and exercise creation
- **Progress Tracking** - Performance analytics and improvement suggestions

### **👨‍👩‍👧‍👦 Parent Features**
- **Weekly Summaries** - Comprehensive student progress reports
- **Actionable Alerts** - Timely notifications and recommendations
- **Communication Drafting** - AI-assisted parent-teacher communication
- **Payment Management** - Fee tracking and payment scheduling

### **🆘 Support Staff Features**
- **FAQ Triage** - Intelligent issue categorization and routing
- **Suggested Resolutions** - AI-powered solution recommendations
- **Knowledge Base Management** - Dynamic content updates and optimization
- **Escalation Intelligence** - Smart routing to appropriate specialists

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Agent         │    │   Fastify API   │    │   PostgreSQL    │
│   Integration   │◄──►│   Server        │◄──►│   + pgvector    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agent      │    │   RAG Service   │    │   Redis Cache   │
│   Manager       │◄──►│   (Vector DB)   │◄──►│   (Context)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LLM Service   │    │   Security      │    │   Email Service │
│   (OpenAI/Gemini)│◄──►│   Manager      │◄──►│   (SMTP)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Repository    │    │   MCP           │    │   Business      │
│   Layer         │◄──►│   Integration   │◄──►│   Logic         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### **Backend Framework**
- **Node.js** - Runtime environment
- **Fastify** - High-performance web framework
- **TypeScript** - Type-safe development
- **Prisma** - Database ORM

### **AI & Machine Learning**
- **LangChain** - AI application framework
- **OpenAI GPT-4** - Primary LLM provider
- **Google Gemini** - Alternative LLM
- **Anthropic Claude** - Enterprise LLM option
- **Model Context Protocol (MCP)** - Extensible AI tool integration

### **Database & Storage**
- **PostgreSQL** - Primary database
- **pgvector** - Vector similarity search
- **Redis** - Caching and session management

### **Communication & Integration**
- **Twilio** - Voice call handling and SMS
- **SMTP** - Email delivery
- **Webhooks** - External service integration

### **Monitoring & DevOps**
- **Docker** - Containerization
- **Datadog** - Application monitoring
- **PM2** - Process management

### **Architecture Patterns**
- **Repository Pattern** - Data access abstraction layer
- **Service Layer** - Business logic separation
- **MCP Integration** - Extensible AI capabilities
- **Modular Design** - Scalable component architecture

---

*Empowering education through intelligent automation* 
