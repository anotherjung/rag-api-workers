# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Workers project implementing a Retrieval-Augmented Generation (RAG) system using:
- **Hono.js** - Web framework for routing and middleware
- **Cloudflare AI** - For embeddings and text generation
- **D1 Database** - For document storage
- **Vectorize** - For semantic vector search
- **Workflows** - For durable document processing

## Development Commands

### Core Development
- `npm run dev` or `npm start` - Start local development server with Wrangler
- `npx wrangler dev --remote` - Run development server with remote resources (recommended for full functionality)
- `npm run deploy` - Deploy to Cloudflare Workers  
- `npm test` - Run tests with Vitest

### Database Management
- `npx wrangler d1 migrations apply rag-ai --remote` - Apply migrations to production database
- `npx wrangler d1 migrations apply rag-ai --local` - Apply migrations to local database
- `npx wrangler d1 execute rag-ai --remote --command="SELECT * FROM notes LIMIT 5;"` - Query production database
- `npx wrangler d1 list` - List all D1 databases

### Vector Operations
- `npx wrangler vectorize list` - List all Vectorize indexes
- `npx wrangler vectorize create vector-index --dimensions=768 --metric=cosine` - Create new vector index

### Monitoring
- `npx wrangler tail --format pretty` - View real-time logs from deployed worker

### Testing
- Tests use Vitest with Cloudflare Workers pool for integration testing
- Test configuration is in `vitest.config.js` which references `wrangler.jsonc`
- Tests include both unit-style and integration-style examples
- Comprehensive testing guide available in `docs/specs/testing.md`

## Architecture

### Project Structure
- `src/index.js` - Main Hono.js application with REST API routes
- `src/vectorize.js` - RAG workflow for document processing
- `src/agents/` - Search agents for hybrid RAG implementation
  - `base-agent.js` - Base class for all agents
  - `vector-agent.js` - Semantic vector search agent
- `test/index.spec.js` - Test files using Cloudflare Workers test utilities
- `wrangler.jsonc` - Cloudflare Workers configuration with all bindings
- `vitest.config.js` - Test configuration for Workers environment

### Key Technologies
- **Cloudflare Workers** - Serverless execution environment
- **Cloudflare AI** - AI inference binding (`@cf/meta/llamma-3b-instruct` model)
- **Vitest** - Testing framework with Workers-specific pool
- **Wrangler** - Cloudflare Workers CLI tool

### Current Implementation
The worker implements a RAG system with:

#### API Endpoints (Hono.js)
- `GET /?text=query&model=llama|llama-70b` - RAG-powered AI query with context retrieval
- `GET /health` - Health check endpoint  
- `POST /notes` - Create and index new documents via RAG workflow
- `GET /search?q=query` - Direct semantic search using vector similarity
- `DELETE /notes/:id` - Remove note from both database and vector index

#### RAG Workflow
1. **Document Ingestion**: Accepts text via POST /notes
2. **Embedding Generation**: Converts text to vectors using `@cf/baai/bge-base-en-v1.5`
3. **Storage**: Saves to D1 database and Vectorize index
4. **Search**: Vector similarity search with agent-based architecture

#### Agent Architecture
- **BaseAgent**: Abstract base class for search strategies
- **VectorAgent**: Implements semantic similarity search
- Future agents planned for keyword search and metadata filtering

### Configuration
- All bindings configured in `wrangler.jsonc` 
- AI models: 
  - `@cf/meta/llama-3.2-1b-instruct` (default, fast)
  - `@cf/meta/llama-3.1-70b-instruct` (high-capability, via `model=llama-70b` param)
  - `@cf/baai/bge-base-en-v1.5` (embeddings, 768 dimensions)
- Database: D1 with `notes` table (see `migrations/0001_initial_setup.sql`)
- Vector index: 768-dimensional cosine similarity, threshold 0.5 for search results

## Database Setup

The database schema is managed through migrations in the `migrations/` directory:

```bash
# Apply all pending migrations to production
npx wrangler d1 migrations apply rag-ai --remote

# Apply migrations to local development database  
npx wrangler d1 migrations apply rag-ai --local
```

Current schema includes `notes` table with `id`, `text`, `created_at` fields.

## Development Notes

### Local vs Production Differences
- **Local development**: Limited Vectorize and Workflows support, returns mock responses
- **Production deployment**: Full RAG functionality with vector search and workflows
- Use `npx wrangler dev --remote` for accessing production resources during development

### Architecture Patterns
- **Agent-based search**: Extensible agent system in `src/agents/` (BaseAgent → VectorAgent)
- **Dual model support**: Fast Llama-1B for efficiency, Llama-70B for complex reasoning  
- **Context-aware responses**: Vector search results used as context for AI generation
- **Error boundaries**: Local/production mode detection with appropriate fallbacks

### Testing Approach
- Vitest with Cloudflare Workers pool for realistic testing environment
- Comprehensive test scenarios documented in `docs/specs/testing.md`
- Configuration uses JSONC format with extensive documentation comments

## Testing the Implementation

### Local Development (Limited)
```bash
# Test health check (ports change on each restart)
curl http://localhost:8787/health

# Test RAG query with different models
curl "http://localhost:8787/?text=What+is+machine+learning&model=llama-70b"
curl "http://localhost:8787/?text=Hello"  # defaults to llama-1b

# Test note creation (mock response in local)
curl -X POST http://localhost:8787/notes \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is fascinating"}'

# Test search (mock response in local)
curl "http://localhost:8787/search?q=machine+learning"
```

### Production Testing
After deployment (`npm run deploy`), test full RAG functionality:

```bash
# Test production endpoints (replace with your worker URL)
curl "https://rag-ai-tutorial.jungno.workers.dev/?text=What+is+AI&model=llama-70b"
curl -X POST https://rag-ai-tutorial.jungno.workers.dev/notes \
  -H "Content-Type: application/json" \
  -d '{"text": "AI is transforming industries"}'
curl "https://rag-ai-tutorial.jungno.workers.dev/search?q=AI"
```

See `docs/specs/testing.md` for comprehensive testing scenarios and expected behaviors.