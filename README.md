
https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/#1-create-a-new-worker-project

https://developers.cloudflare.com/workers-ai/platform/pricing/
find model

npx wrangler dev --remote

src/index.js

npx wrangler deploy


curl  https://rag-ai-tutorial.jungno.workers.dev

mkdir docs && mkdir docs/specs
touch docs/specs/index.md

touch docs/specs/vectorize.md src/vectorize.js

npx wrangler run dev

npx wrangler dev --remote

http://localhost:56100

curl -X POST http://localhost:56100 \
  -H "Content-Type: application/json" \
  -d '{"text": "batman"}'

curl "http://localhost:56100?q=artificial intelligence"

npx wrangler tail --format pretty

npm run deploy

curl -X POST https://rag-ai-tutorial.jungno.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"text": "batman"}'

 https://rag-ai-tutorial.jungno.workers.dev

curl "https://rag-ai-tutorial.jungno.workers.dev?q=batman"


touch docs/specs/hono.md src/hono.js


npx wrangler d1 migrations apply rag-ai

# RAG AI Tutorial

A Retrieval-Augmented Generation (RAG) system built with Cloudflare Workers, implementing semantic search and AI-powered responses using Cloudflare's AI, D1, Vectorize, and Workflows.

## Overview

This project demonstrates how to build a complete RAG system using:
- **Cloudflare Workers** - Serverless execution environment
- **Hono.js** - Lightweight web framework for routing
- **Cloudflare AI** - Text generation and embeddings
- **Cloudflare D1** - SQL database for note storage
- **Cloudflare Vectorize** - Vector database for semantic search
- **Cloudflare Workflows** - Durable execution for data processing

## Features

- 🤖 AI-powered question answering with context
- 🔍 Semantic search using vector embeddings
- 📝 Note storage and indexing
- 🌐 RESTful API with multiple endpoints
- 🧪 Comprehensive test coverage
- 🚀 Production-ready deployment

## Prerequisites

- Node.js (v18 or later)
- Cloudflare account
- Wrangler CLI

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd rag-ai-tutorial
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install/update Wrangler CLI:**
   ```bash
   npm i -D wrangler@latest
   ```

## Setup

1. **Authenticate with Cloudflare:**
   ```bash
   npx wrangler login
   ```

2. **Create D1 database:**
   ```bash
   npx wrangler d1 create rag-ai
   ```
   Update `wrangler.jsonc` with your database ID.

3. **Create Vectorize index:**
   ```bash
   npx wrangler vectorize create vector-index --dimensions=768 --metric=cosine
   ```

4. **Apply database migrations:**
   ```bash
   # Create migrations directory (if not exists)
   mkdir -p migrations
   
   # Apply migrations to remote database
   npx wrangler d1 migrations apply rag-ai --remote
   
   # Apply migrations locally for development
   npx wrangler d1 migrations apply rag-ai --local
   ```

## Development

### Start local development server:
```bash
npm run dev
# or
npm start
# or (for remote resources)
npx wrangler dev --remote
```

### API Endpoints:

- **GET /** - AI query with context (query param: `text`)
- **GET /health** - Health check
- **POST /notes** - Create new note
- **GET /search** - Vector search (query param: `q`)

### Example requests:

**Ask a question:**
```bash
curl "http://localhost:8787?text=What is machine learning?"
```

**Create a note:**
```bash
curl -X POST http://localhost:8787/notes \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is a subset of AI that enables computers to learn from data."}'
```

**Search notes:**
```bash
curl "http://localhost:8787/search?q=artificial intelligence"
```

## Testing

Run the test suite:
```bash
npm test
```

Tests include:
- Health check endpoint
- AI response generation
- Note creation and validation
- Search functionality
- Error handling

## Deployment

1. **Deploy to Cloudflare Workers:**
   ```bash
   npm run deploy
   ```

2. **Test production endpoints:**
   ```bash
   # Ask a question
   curl https://rag-ai-tutorial.jungno.workers.dev?text="What is the square root of 9?"
   
   # Create a note
   curl -X POST  https://rag-ai-tutorial.jungno.workers.dev/notes \
     -H "Content-Type: application/json" \
     -d '{"text": "Batman is a fictional superhero."}'
   
   # Search notes
   curl "https://rag-ai-tutorial.jungno.workers.dev/search?q=batman"
   ```

## Architecture

### RAG Workflow:
1. **Note Creation** → Store in D1 database
2. **Embedding Generation** → Create vector using AI model
3. **Vector Storage** → Index in Vectorize for search
4. **Query Processing** → Find similar content and generate context-aware responses

### Key Components:
- `src/index.js` - Main Hono application with API routes
- `src/vectorize.js` - RAG workflow implementation  
- `src/agents/` - Modular search agents (extensible architecture)
- `test/index.spec.js` - Comprehensive test suite
- `migrations/` - Database migration files
- `wrangler.jsonc` - Cloudflare Workers configuration

## Configuration

Key files:
- `wrangler.jsonc` - Cloudflare Workers configuration with AI, D1, Vectorize, and Workflows bindings
- `vitest.config.js` - Test configuration with Workers pool
- `package.json` - Dependencies and scripts
- `migrations/` - Database schema and migration files

### Important Configuration Notes:
- **Local Development**: Some features (workflows, vectorize) have limited local support
- **Migrations**: Properly configured in `migrations/` directory with `migrations_dir` setting
- **Bindings**: Uses correct binding names (VECTORIZE, not VECTOR_INDEX)
- **AI Models**: 
  - Embeddings: `@cf/baai/bge-base-en-v1.5` (768 dimensions)
  - Text Generation: `@cf/meta/llama-3.2-1b-instruct`

## Monitoring

View logs in real-time:
```bash
npx wrangler tail --format pretty
```

## Original Tutorial References

- [Cloudflare Workers AI Tutorial](https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/)
- [Cloudflare AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

## Framework Documentation

- [Hono.js Documentation](https://hono.dev/)

---

## Original Development Notes

### Quick Commands
```bash
# Development
npx wrangler dev --remote
npm run dev

# Deployment  
npx wrangler deploy
npm run deploy

# vector
npx wrangler vectorize list

# Database
npx wrangler d1 migrations apply rag-ai --remote
npx wrangler d1 migrations apply rag-ai --local
npx wrangler d1 execute rag-ai --remote --command="SELECT * FROM notes LIMIT 5;"

# Monitoring
npx wrangler tail --format pretty

# Testing
npm test
```

### Test URLs
- Local: http://localhost:8787
- Production: https://rag-ai-tutorial.jungno.workers.dev

### Sample API Calls
```bash
# Query
curl https://rag-ai-tutorial.jungno.workers.dev?text="What is the square root of 9?"

# Create note
curl -X POST https://rag-ai-tutorial.jungno.workers.dev/notes \
  -H "Content-Type: application/json" \
  -d '{"text": "batman like black"}'

curl -X POST https://rag-ai-tutorial.jungno.workers.dev/notes \
  -H "Content-Type: application/json" \
  -d '{"text": "plants are green"}'

# Search
curl "https://rag-ai-tutorial.jungno.workers.dev/search?q=batman"

curl "https://rag-ai-tutorial.jungno.workers.dev/search?q=green"
```
