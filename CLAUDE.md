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
- `pnpm run dev` or `npm start` - Start local development server with Wrangler
- `npx wrangler dev --remote` - Run development server with remote resources (as noted in R1.md)
- `pnpm run deploy` - Deploy to Cloudflare Workers
- `pnpm test` - Run tests with Vitest

### Testing
- Tests use Vitest with Cloudflare Workers pool for integration testing
- Test configuration is in `vitest.config.js` which references `wrangler.jsonc`
- Tests include both unit-style and integration-style examples

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
- `GET /` - Basic AI demo endpoint
- `GET /health` - Health check endpoint
- `POST /notes` - Create and index new documents
- `GET /search?q=query` - Semantic search using vector similarity

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
- AI models: `@cf/meta/llama-3.2-1b-instruct` (generation), `@cf/baai/bge-base-en-v1.5` (embeddings)
- Database: D1 with notes table
- Vector index: 768-dimensional cosine similarity

## Database Setup

Before running the application, ensure the database schema is up to date:

```bash
# Create or update the notes table with metadata support
npx wrangler d1 execute rag-ai --remote --file docs/db-migration.sql
```

## Development Notes

- This project implements a hybrid RAG architecture with Hono.js
- Local development has limitations for Vectorize and Workflows
- Production deployment required for full functionality
- Observability is enabled in the Wrangler configuration
- The test setup includes both unit and integration testing patterns for Workers
- Configuration uses JSONC format for Wrangler settings with extensive documentation comments

## Testing the Implementation

### Local Development (Limited)
```bash
# Test health check
curl http://localhost:8787/health # ports will change
curl http://localhost:59891/health

# Test POST endpoint (mock response in local)
curl -X POST http://localhost:8787/notes \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is fascinating"}'

 curl -X POST http://localhost:59891/notes \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is fascinating"}'

# Test search (mock response in local)
curl "http://localhost:8787/search?q=machine+learning"
curl "http://localhost:59891/search?q=machine+learning"

```

### Production Testing
After deployment (`npm run deploy`), all features including vector search and workflows will be functional.