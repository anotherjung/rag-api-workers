# Adding embeddings using Cloudflare D1 and Vectorize

## Overview

This guide implements a complete RAG (Retrieval-Augmented Generation) system using Cloudflare's stack: D1 for data storage, Vectorize for semantic search, and Workflows for durable processing.

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

Complete configuration with all bindings:
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

## Workflow Implementation

### Basic Workflow Structure (src/vectorize.js)
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

### Enhanced Workflow for Complete RAG Pipeline
```javascript
import { WorkflowEntrypoint } from "cloudflare:workers";

export class RAGWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    // Step 1: Generate embedding from text
    const embedding = await step.do("generate embedding", async () => {
      const result = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: event.params.text
      });
      return result.data[0]; // 768-dimensional vector
    });

    // Step 2: Store text in D1 database
    const noteRecord = await step.do("store in database", async () => {
      const { results } = await this.env.DB.prepare(
        "INSERT INTO notes (text) VALUES (?) RETURNING *"
      ).bind(event.params.text).run();
      return results[0];
    });

    // Step 3: Store vector in Vectorize
    await step.do("store vector", async () => {
      await this.env.VECTORIZE.upsert([{
        id: noteRecord.id.toString(),
        values: embedding,
        metadata: { 
          text: event.params.text,
          timestamp: new Date().toISOString()
        }
      }]);
    });

    return { 
      success: true, 
      noteId: noteRecord.id,
      text: event.params.text 
    };
  }
}
```

## Calling the Workflow

### Integration in Main Worker (src/index.js)
```javascript
import { RAGWorkflow } from "./vectorize";
export { RAGWorkflow };

export default {
  async fetch(request, env, ctx) {
    // Handle POST requests to create notes
    if (request.method === "POST") {
      const { text } = await request.json();
      
      // Create workflow instance
      const instance = await env.RAG_WORKFLOW.create({ 
        params: { text } 
      });
      
      return new Response(JSON.stringify({ 
        success: true,
        workflowId: instance.id,
        message: "Note processing started"
      }));
    }
    
    // Handle GET requests for semantic search
    if (request.method === "GET") {
      const url = new URL(request.url);
      const query = url.searchParams.get("q");
      
      if (query) {
        // Generate query embedding
        const queryEmbedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
          text: query
        });
        
        // Search similar vectors
        const matches = await env.VECTORIZE.query(queryEmbedding.data[0], {
          topK: 5,
          returnMetadata: true
        });
        
        return new Response(JSON.stringify({
          query,
          results: matches.matches.map(match => ({
            score: match.score,
            text: match.metadata.text,
            timestamp: match.metadata.timestamp
          }))
        }));
      }
    }
    
    // Default AI demo
    const answer = await env.AI.run("@cf/meta/llama-3.2-1b-instruct", {
      messages: [{ role: "user", content: "What is the square root of 9?" }]
    });
    return new Response(JSON.stringify(answer));
  }
};
```

## Testing the Implementation

### 1. Local Development
```bash
npm run dev
```

### 2. Create a Note (POST)
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is fascinating and powerful"}'
```

**Expected Response:**
```json
{
  "success": true,
  "workflowId": "workflow-12345",
  "message": "Note processing started"
}
```

### 3. Search Notes (GET)
```bash
curl "http://localhost:8787?q=artificial intelligence"
```

**Expected Response:**
```json
{
  "query": "artificial intelligence",
  "results": [
    {
      "score": 0.85,
      "text": "Machine learning is fascinating and powerful",
      "timestamp": "2025-01-13T10:30:00.000Z"
    }
  ]
}
```

### 4. Monitor Workflow Execution
```bash
npx wrangler tail
```

## Deployment

```bash
npm run deploy
```

Test deployed version:
```bash
# Create note
curl -X POST https://rag-ai-tutorial.your-subdomain.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"text": "Cloud computing revolutionizes software development"}'

# Search notes
curl "https://rag-ai-tutorial.your-subdomain.workers.dev?q=cloud technology"
```

## Architecture Overview

### Data Flow
1. **Text Input** → HTTP POST request with JSON body
2. **Workflow Creation** → `env.RAG_WORKFLOW.create({ params: { text } })`
3. **Embedding Generation** → AI model converts text to 768-dimensional vector
4. **Database Storage** → Text stored in D1 with auto-generated ID
5. **Vector Storage** → Embedding stored in Vectorize with metadata
6. **Search Query** → HTTP GET with query parameter
7. **Semantic Search** → Query embedding matched against stored vectors
8. **Results Return** → Ranked results with similarity scores

### Key Concepts

- **Vector Index**: 768-dimensional space for semantic similarity
- **Durable Workflows**: Fault-tolerant processing with automatic retries
- **Step Isolation**: Each workflow step creates a checkpoint
- **Cosine Similarity**: Metric for comparing vector similarity
- **Metadata Storage**: Additional context stored with vectors

### Performance Considerations

- **Embedding Generation**: ~100-300ms per text
- **Vector Storage**: ~50-100ms per operation
- **Search Latency**: ~10-50ms for similarity queries
- **Workflow Durability**: Survives worker restarts and failures
- **Concurrency**: Multiple workflows execute independently

### Error Handling

The workflow system automatically handles:
- Network timeouts and retries
- Partial failures with step-level recovery
- Resource unavailability with exponential backoff
- Data consistency across multiple services

### Next Steps

1. **Enhanced Search**: Add filtering by metadata (date, categories)
2. **Batch Processing**: Handle multiple texts in single workflow
3. **Real-time Updates**: Implement vector updates and deletions
4. **Advanced RAG**: Integrate with LLM for context-aware responses
5. **Authentication**: Add API key or token-based access control
6. **Analytics**: Track usage patterns and search performance