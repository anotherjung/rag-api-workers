# Step-by-Step Testing Guide for RAG Chat System with Notes Context

## Overview

This guide provides comprehensive testing instructions for the enhanced RAG system that supports multi-model chat with contextual notes. The system dynamically includes relevant notes as context when answering questions, demonstrating the power of Retrieval-Augmented Generation.

## System Architecture Understanding

**Key Components:**
- **Models**: Llama-3.1-70b-instruct (high-capability) and Llama-3.2-1b-instruct (fast/default)
- **Context System**: `[systemPrompt, notes ? contextMessage : ''].join(" ")`
- **RAG Workflow**: Question → Embedding → Vector Search → Context Retrieval → AI Response

## Testing Scenarios

### 1. Health Check & System Status

```bash
# Verify system is running
curl "http://localhost:51246/health"
```

**Expected Response:**
```json
{"status":"healthy","timestamp":"2025-07-13T09:42:18.062Z"}
```

### 2. Basic Greetings (No Context)

**Purpose**: Test AI responses without any note context

```bash
# Test simple greeting with high-capability Llama model
curl "http://localhost:51246/?text=Hello&model=llama-70b" -i

# Test greeting with default Llama model  
curl "http://localhost:51246/?text=Hi+there" -i
```

**Expected Behavior:**
- Response without context (notes array empty)
- Header shows `x-model-used: @cf/meta/llama-3.1-70b-instruct` or `@cf/meta/llama-3.2-1b-instruct`
- Friendly greeting response

### 3. Questions Without Context

**Purpose**: Test how AI handles questions when no relevant notes exist

```bash
# Ask about a random topic with high-capability model
curl "http://localhost:51246/?text=What+is+quantum+physics&model=llama-70b" -i

# Ask with default model
curl "http://localhost:51246/?text=How+do+airplanes+fly" -i
```

**Expected Response Structure:**
```json
{
  "answer": "AI-generated response about the topic...",
  "question": "What is quantum physics",
  "context": [],
  "matchCount": 0
}
```

### 4. Adding Notes for Context

**Purpose**: Populate the knowledge base with relevant information

```bash
# Add a note about machine learning
curl -X POST "http://localhost:51246/notes" \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for each task."}'

# Add a note about neural networks
curl -X POST "http://localhost:51246/notes" \
  -H "Content-Type: application/json" \
  -d '{"text": "Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information and learn patterns from data."}'

# Add a note about Python programming
curl -X POST "http://localhost:51246/notes" \
  -H "Content-Type: application/json" \
  -d '{"text": "Python is a high-level programming language known for its simplicity and readability. It is widely used in data science, web development, and artificial intelligence applications."}'

# Add a note about data science
curl -X POST "http://localhost:51246/notes" \
  -H "Content-Type: application/json" \
  -d '{"text": "Data science combines statistics, mathematics, programming, and domain expertise to extract insights from structured and unstructured data. It involves data collection, cleaning, analysis, and visualization."}'
```

**Expected Response** (Local Development):
```json
{
  "success": true,
  "message": "Text received successfully",
  "text": "Your note content...",
  "note": "Workflow processing disabled in local dev",
  "isLocal": true
}
```

### 5. Questions WITH Context (RAG in Action)

**Purpose**: Test how AI uses retrieved notes as context

```bash
# Question about machine learning (should match the first note)
curl "http://localhost:51246/?text=What+is+machine+learning&model=llama-70b" -i

# Question about neural networks (should match the second note)
curl "http://localhost:51246/?text=Explain+neural+networks&model=llama" -i

# Question about programming (should match Python note)
curl "http://localhost:51246/?text=Tell+me+about+Python+programming" -i

# Question about data analysis (should match data science note)
curl "http://localhost:51246/?text=What+does+data+science+involve&model=llama-70b" -i
```

**Expected Response Structure** (with context):
```json
{
  "answer": "Based on the context provided, machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for each task. [AI elaborates based on the context]",
  "question": "What is machine learning",
  "context": ["Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for each task."],
  "matchCount": 1
}
```

### 6. Search Functionality

**Purpose**: Test direct search without AI generation

```bash
# Search for machine learning related notes
curl "http://localhost:51246/search?q=machine+learning" -i

# Search for programming related notes
curl "http://localhost:51246/search?q=programming" -i

# Search for data related notes
curl "http://localhost:51246/search?q=data" -i
```

**Expected Response Structure:**
```json
{
  "query": "machine learning",
  "count": 1,
  "results": [
    {
      "id": "note-id",
      "score": 0.85,
      "text": "Machine learning is a subset of artificial intelligence...",
      "metadata": {
        "created_at": "timestamp"
      }
    }
  ]
}
```

### 7. Context System Verification

**Purpose**: Understand how the system prompt + context works

The system uses this context construction:
```javascript
system: [systemPrompt, notes ? contextMessage : ''].join(" ")
```

**System Prompt**: `"When answering the question or responding, use the context provided, if it is provided and relevant."`

**Context Message** (when notes exist):
```
Context:
- Note 1 content
- Note 2 content
```

**Test Context Behavior:**
```bash
# Ask a specific question that should trigger context
curl "http://localhost:51246/?text=How+do+neural+networks+work+in+machine+learning&model=llama-70b" -i
```

This should match multiple notes and provide a comprehensive context-aware response.

### 8. Model Comparison

**Purpose**: Compare responses between high-capability and standard Llama models

```bash
# Same question with different models
curl "http://localhost:51246/?text=What+are+the+applications+of+machine+learning&model=llama-70b" -i
curl "http://localhost:51246/?text=What+are+the+applications+of+machine+learning&model=llama" -i
```

**Compare:**
- Response quality and style (70B vs 1B parameters)
- Context utilization and reasoning depth
- Header differences (`x-model-used`)

### 9. Edge Cases

**Purpose**: Test system robustness

```bash
# Empty question
curl "http://localhost:51246/?text=" -i

# Very long question
curl "http://localhost:51246/?text=This+is+a+very+long+question+about+machine+learning+and+artificial+intelligence+and+data+science+and+programming+with+lots+of+keywords" -i

# Invalid model parameter (should default to standard llama)
curl "http://localhost:51246/?text=Hello&model=invalid" -i

# Special characters
curl "http://localhost:51246/?text=What%27s+the+difference+between+AI+%26+ML%3F" -i
```

### 10. Note Deletion

**Purpose**: Test note and vector cleanup

```bash
# Delete a specific note (use an ID from your database)
curl -X DELETE "http://localhost:51246/notes/123" -i

# Verify note is gone by searching
curl "http://localhost:51246/search?q=machine+learning" -i
```

**Expected Response** (Local):
```json
{
  "message": "Delete functionality disabled in local dev",
  "noteId": "123",
  "note": "Vectorize local bindings not yet supported",
  "isLocal": true
}
```

## Production Testing

For full functionality testing, deploy to Cloudflare Workers:

```bash
npm run deploy
```

Then repeat tests using the production URL where:
- Vector search will be fully functional
- Notes will be properly stored and retrieved
- Delete operations will actually remove data

## Testing Checklist

- [ ] Health endpoint responds
- [ ] Basic greetings work without context
- [ ] Questions work without relevant notes
- [ ] Notes can be added successfully
- [ ] Questions retrieve relevant context
- [ ] Context improves AI responses
- [ ] Both models (Llama-70B/Llama-1B) work
- [ ] Search functionality returns relevant results
- [ ] Delete operations work (in production)
- [ ] Model headers are correctly set
- [ ] Edge cases handled gracefully

## Expected Learning Outcomes

After testing, you should observe:

1. **Context Enhancement**: Questions with relevant notes get more informed, specific answers
2. **Model Differences**: Llama-70B (high-capability, advanced reasoning) vs Llama-1B (fast, efficient) characteristics
3. **RAG Workflow**: Understanding how embedding � search � context � generation works
4. **System Robustness**: How the system handles various input scenarios

## Technical Notes

### Context Construction
The system constructs context using:
```javascript
const contextMessage = notes.length
  ? `Context:\n${notes.map(note => `- ${note}`).join("\n")}`
  : "";

const systemPrompt = "When answering the question or responding, use the context provided, if it is provided and relevant.";

// For Workers AI (Gemma/Llama)
const messages = [
  ...(notes.length ? [{ role: "system", content: contextMessage }] : []),
  { role: "system", content: systemPrompt },
  { role: "user", content: question }
];
```

### Model Selection Logic
```javascript
const selectedModel = c.req.query("model") || "llama";
let modelName = "";
if (selectedModel === "llama-70b") {
  modelName = "@cf/meta/llama-3.1-70b-instruct";
} else {
  modelName = "@cf/meta/llama-3.2-1b-instruct";
}
```

### Vector Search Parameters
- **topK**: 5 (returns top 5 similar vectors)
- **Score Threshold**: 0.5 (filters low-relevance matches)
- **Embedding Model**: `@cf/baai/bge-base-en-v1.5`

This comprehensive testing demonstrates the power of Retrieval-Augmented Generation in providing contextually aware AI responses.