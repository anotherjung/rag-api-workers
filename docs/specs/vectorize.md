# Adding embeddings using Cloudflare D1 and Vectorize

## Overview

This guide documents the current RAG (Retrieval-Augmented Generation) implementation using Cloudflare Workers, AI, D1, Vectorize, and Workflows. This reflects the actual code state, not planned features.

## Documentation Reference
https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/#4-adding-embeddings-using-cloudflare-d1-and-vectorize

## Initial Setup Commands

### Create Vector Index
```bash
npx wrangler vectorize create vector-index --dimensions=768 --metric=cosine
```

### Create D1 Database
```bash
npx wrangler d1 create rag-ai
```

### Database Setup
```bash
# Create notes table
npx wrangler d1 execute rag-ai --remote --command "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, text TEXT NOT NULL)"

# Insert sample data
npx wrangler d1 execute rag-ai --remote --command "INSERT INTO notes (text) VALUES ('The best pizza topping is pepperoni')"
```

## Configuration (wrangler.jsonc)

Current configuration with all bindings:
```json
{
  "vectorize": [
    {
      "binding": "VECTORIZE",
      "index_name": "vector-index"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "rag-ai",
      "database_id": "b7d229ef-3f2a-421e-87a7-1a126b86f7a4"
    }
  ],
  "workflows": [
    {
      "name": "rag",
      "binding": "RAG_WORKFLOW",
      "class_name": "RAGWorkflow"
    }
  ]
}
```

## Current Implementation

### Workflow Implementation (src/vectorize.js)
```javascript
import { WorkflowEntrypoint } from "cloudflare:workers";

export class RAGWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    await step.do("example step", async () => {
      console.log("Hello World!");
    });
  }
}
```

**Status:** Basic workflow structure in place, logs "Hello World!" but doesn't process the RAG pipeline yet.

### Main Worker (src/index.js)
```javascript
import { RAGWorkflow } from "./vectorize";
export { RAGWorkflow };

export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method === "POST") {
        const { text } = await request.json();
        console.log("Received text:", text);
  
        // For now, just return success without workflow
        // TODO: Enable workflow once local dev issues are resolved
        return new Response(JSON.stringify({ 
          success: true,
          message: "Text received successfully",
          text: text,
          note: "Workflow processing temporarily disabled in local dev"
        }));
      }

      // Handle GET requests - simplified for now
      if (request.method === "GET") {
        const url = new URL(request.url);
        const query = url.searchParams.get("q");
        
        if (query) {
          return new Response(JSON.stringify({
            message: "Search functionality temporarily disabled in local dev",
            query: query,
            note: "Vectorize local bindings not yet supported"
          }));
        }
      }

      // Default AI demo
      const answer = await env.AI.run("@cf/meta/llama-3.2-1b-instruct", {
        messages: [{ role: "user", content: "What is the square root of 9?" }]
      });
      return new Response(JSON.stringify(answer));
    } catch (error) {
      console.error("Error:", error);
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }), { status: 500 });
    }
  },
};
```

## API Endpoints (Currently Implemented)

### GET `/` (Default)
- **Description**: Returns AI-generated response to "What is the square root of 9?"
- **Response**: JSON with AI model response
- **Status**: ✅ Working

### GET `/?q=query`
- **Description**: Currently returns a placeholder message
- **Response**: JSON indicating search is temporarily disabled
- **Status**: 🚧 Placeholder only

### POST `/`
- **Description**: Accepts text input, returns acknowledgment
- **Request Body**: `{"text": "your text here"}`
- **Response**: JSON confirmation without processing
- **Status**: 🚧 Input accepted, no processing yet

## Development Status

### ✅ Implemented
- Basic worker structure with error handling
- POST endpoint accepting text input
- GET endpoint with query parameter parsing
- AI model integration for demo responses
- Workflow class structure

### 🚧 In Progress / Disabled
- Workflow execution (disabled in local dev)
- Vector search functionality (local bindings not supported)
- Text embedding generation
- D1 database operations
- Vector storage in Vectorize

### ❌ Not Implemented
- Complete RAG pipeline
- Semantic search with similarity scoring
- Real-time vector operations
- Context-aware AI responses using retrieved documents

## Local Development Issues

### Known Limitations
1. **Vectorize Bindings**: Not fully supported in local development
2. **Workflow Execution**: Times out in local environment
3. **Remote Dependencies**: AI model calls require remote access

### Current Workarounds
- POST requests return success without processing
- GET search returns placeholder messages
- Default AI demo works independently

## Testing

### Working Tests
```bash
# Test default AI functionality
curl http://localhost:8787

# Test POST endpoint (returns acknowledgment)
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is fascinating"}'

# Test search placeholder
curl "http://localhost:8787?q=artificial intelligence"
```

### Expected Responses

**GET (Default):**
```json
{
  "response": "The square root of 9 is 3.",
  "usage": {"prompt_tokens": 20, "completion_tokens": 11, "total_tokens": 31}
}
```

**POST:**
```json
{
  "success": true,
  "message": "Text received successfully",
  "text": "Machine learning is fascinating",
  "note": "Workflow processing temporarily disabled in local dev"
}
```

**GET with Query:**
```json
{
  "message": "Search functionality temporarily disabled in local dev",
  "query": "artificial intelligence",
  "note": "Vectorize local bindings not yet supported"
}
```

### Deployment for Full Functionality
```bash
npm run deploy
```

**Note**: Full RAG functionality requires production deployment where all Cloudflare bindings are fully supported.

## Next Implementation Steps

1. **Enable Workflow Processing** in production environment
2. **Implement Text Embedding** using `@cf/baai/bge-base-en-v1.5`
3. **Add D1 Database Operations** for text storage
4. **Implement Vector Storage** in Vectorize
5. **Build Semantic Search** with similarity matching
6. **Create Context-Aware Responses** combining search results with AI generation

## Architecture Notes

- **Serverless**: Runs on Cloudflare Workers platform
- **Durable Workflows**: For multi-step RAG processing
- **Edge AI**: Model inference at the edge
- **Vector Database**: Semantic search capabilities
- **SQL Database**: Structured data storage

**Current State**: Foundation implemented, RAG pipeline pending production deployment.