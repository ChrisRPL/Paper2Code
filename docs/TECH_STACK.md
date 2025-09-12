# TECH_STACK.md

## Recommended Technology Stack for Paper2Code Web Application

### 🎯 Architecture Overview
Modern, scalable web application with **chat-like interface** for PDF-to-code conversion using the existing Paper2Code multi-agent system.

---

## 🎨 Frontend Stack

### **Core Framework**
- **[Next.js 15](https://nextjs.org/)** with App Router
  - Server-side rendering and React Server Components
  - Built-in routing, caching, and performance optimization
  - Perfect for real-time applications
  - Excellent TypeScript support

### **Language & Type Safety**
- **TypeScript 5.3+**
  - Full type safety across frontend and API
  - Better developer experience and code reliability

### **UI Framework & Styling**
- **[Shadcn/ui](https://ui.shadcn.com/)** - Modern component library
  - Customizable, copy-paste components
  - Built on Radix UI primitives
  - Perfect for chat interfaces and complex workflows
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
  - Rapid prototyping and consistent design
  - Dark/light mode support
  - Responsive design system

### **State Management**
- **Zustand** - Lightweight state management
  - Perfect for chat state, file uploads, and agent progress
  - TypeScript-first with minimal boilerplate

### **Real-time Communication**
- **WebSocket (native)** with FastAPI WebSocket backend
  - Live agent processing updates
  - Real-time chat functionality
  - Streaming responses from LLM agents

---

## 🔧 Backend Stack

### **API Framework**
- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern Python web framework
  - **Why FastAPI?**
    - Native async support for real-time features
    - Automatic OpenAPI/Swagger documentation
    - Excellent WebSocket support for streaming
    - **Seamless integration** with existing Paper2Code Python codebase
    - Built-in request validation and serialization
    - Performance comparable to Node.js/Go

### **Integration Layer**
- **Direct Python Integration**
  - Import and use existing `codes/` modules directly
  - No need to rewrite the multi-agent system
  - Maintain all current functionality

### **File Handling**
- **Built-in FastAPI File Upload**
  - PDF processing pipeline integration
  - Temporary file management
  - Progress tracking for large uploads

### **Background Processing**
- **FastAPI BackgroundTasks**
  - Run Paper2Code agents asynchronously
  - WebSocket updates during processing
  - Queue management for multiple concurrent jobs

---

## 🗄️ Database & Storage

### **Database**
- **SQLite** (development) / **PostgreSQL** (production)
  - Job tracking and progress persistence
  - User session management
  - Processing history and results

### **File Storage**
- **Local File System** (development)
- **AWS S3 / Google Cloud Storage** (production)
  - PDF uploads and generated repositories
  - Artifact storage between processing stages

---

## 🌐 Real-time Features

### **Agent Processing Visualization**
- **React Flow** - Node-based workflow visualization
  - Visual representation of the 3-stage pipeline:
    1. **Planning Agent** → Planning artifacts
    2. **Analysis Agent** → Analysis artifacts  
    3. **Coding Agent** → Final repository
  - Real-time progress indicators
  - Interactive workflow exploration

### **Chat Interface Components**
- **Custom Chat Components** (based on research)
  - File upload with drag-and-drop
  - Message streaming with typing indicators
  - Code syntax highlighting
  - File attachment display
  - Processing status indicators

---

## 📦 Key Dependencies

### **Frontend Dependencies**
```json
{
  "next": "^15.0.0",
  "react": "^18.2.0",
  "typescript": "^5.3.0",
  "@radix-ui/react-*": "latest",
  "tailwindcss": "^3.4.0",
  "zustand": "^4.4.0",
  "lucide-react": "^0.300.0",
  "reactflow": "^11.10.0",
  "framer-motion": "^10.16.0"
}
```

### **Backend Dependencies**
```txt
fastapi>=0.104.0
uvicorn>=0.24.0
websockets>=12.0
python-multipart>=0.0.6
sqlalchemy>=2.0.0
alembic>=1.13.0
pydantic>=2.5.0
# Existing Paper2Code dependencies
openai>=1.65.4
vllm>=0.6.4.post1
transformers>=4.46.3
```

---

## 🚀 Development Tools

### **Development Environment**
- **pnpm** - Fast package manager
- **Vite** - Fast development builds (Next.js built-in)
- **ESLint + Prettier** - Code formatting and linting

### **API Development**
- **FastAPI Automatic Docs** - Interactive API documentation
- **Swagger UI** - API testing interface

### **Real-time Development**
- **Hot Module Replacement** - Next.js built-in
- **FastAPI Auto-reload** - Automatic backend reloading during development

---

## 🔄 Integration Strategy

### **Existing Codebase Integration**
1. **Minimal Changes to Current Code**
   - Keep existing `codes/` structure intact
   - Add FastAPI wrapper around current scripts
   - Expose current functionality via REST/WebSocket APIs

2. **Progressive Enhancement**
   - Start with basic file upload + existing command execution
   - Gradually add real-time features and UI improvements
   - Maintain backward compatibility

3. **Deployment Options**
   - **Development**: Local Next.js + FastAPI servers
   - **Production**: Docker containers or Vercel (frontend) + Railway/Render (backend)

---

## 🎯 Why This Stack?

### **✅ Advantages**
- **Modern & Future-proof**: Latest web technologies and best practices
- **Type Safety**: Full TypeScript coverage across frontend and backend
- **Performance**: Next.js + FastAPI provide excellent performance
- **Real-time Ready**: Native WebSocket support for live agent updates
- **Developer Experience**: Hot reloading, automatic docs, great tooling
- **Scalability**: Can handle multiple concurrent PDF processing jobs
- **Maintainable**: Clean architecture, well-documented components

### **🔧 Perfect for Paper2Code Because**
- **Seamless Python Integration**: FastAPI works directly with existing codebase
- **Real-time Agent Visualization**: Users can see the 3-stage pipeline in action
- **Chat-like UX**: Familiar interface for interacting with AI agents
- **File-centric Workflow**: Built-in PDF upload and repository download
- **Professional UI**: Modern interface suitable for research and development use

---

## 📱 Mobile & Responsive Support
- **Tailwind CSS responsive design system**
- **Progressive Web App (PWA) capabilities**
- **Mobile-optimized chat interface**
- **Touch-friendly file upload experience**