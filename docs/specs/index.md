# RAG AI Tutorial Worker API Specification

## Overview

This Cloudflare Worker implements an AI-powered service using Cloudflare's AI Workers binding with the Llama 3.2 1B Instruct model. The worker demonstrates basic AI inference capabilities in a serverless environment.

## API Endpoints

### GET/POST `/*` (Catch-all)

**Description**: Processes any HTTP request and returns an AI-generated response to a hardcoded question.

**Request**:
- **Method**: Any HTTP method (GET, POST, etc.)
- **URL**: Any path
- **Headers**: None required
- **Body**: Not used (ignored)

**Response**:
- **Content-Type**: `application/json`
- **Body**: JSON object containing the AI model's response

**Example Request**:
```bash
curl https://your-worker.workers.dev
```

**Example Response**:
```json
{
  "response": "The square root of 9 is 3.",
  "success": true
}
```

## AI Model Integration

### Model Configuration
- **Model**: `@cf/meta/llama-3.2-1b-instruct`
- **Provider**: Cloudflare AI Workers
- **Binding**: `AI` (configured in `wrangler.jsonc`)

### Message Format
The worker uses the standard chat completion format:
```javascript
{
  messages: [
    {
      role: "user",
      content: "What is the square root of 9?"
    }
  ]
}
```

### Supported Roles
- `user`: Human input/questions
- `assistant`: AI responses (handled automatically)
- `system`: System instructions (not currently used)

## Implementation Details

### Worker Structure
```javascript
export default {
  async fetch(request, env, ctx) {
    // AI inference logic
  }
}
```

### Environment Bindings
- `env.AI`: Cloudflare AI Workers binding for model inference
- `request`: Standard Fetch API Request object
- `ctx`: Execution context for Workers runtime

### Error Handling
Currently, the worker does not implement explicit error handling. In production, consider adding:
- AI model timeout handling
- Request validation
- Error response formatting
- Rate limiting

## Development

### Local Testing
```bash
npm run dev
# Opens local server at http://localhost:8787/
```

### Deployment
```bash
npm run deploy
```

### Testing
```bash
npm test
```

## Current Limitations

1. **Fixed Question**: The worker currently only responds to a hardcoded question about square roots
2. **No Input Processing**: User input from requests is not processed
3. **No Error Handling**: No explicit error handling for AI model failures
4. **No Authentication**: No authentication or authorization mechanisms
5. **No Rate Limiting**: No protection against abuse

## Future Enhancements

1. **Dynamic Input**: Process user input from request body or query parameters
2. **Multiple Models**: Support for different AI models based on request type
3. **Error Handling**: Comprehensive error handling and user-friendly error responses
4. **Authentication**: API key or token-based authentication
5. **Rate Limiting**: Request rate limiting and quota management
6. **Streaming**: Support for streaming responses for longer AI outputs
7. **Context Management**: Session-based conversation context
8. **Validation**: Input validation and sanitization

## Security Considerations

- No sensitive data is currently processed
- AI model responses should be sanitized before displaying to users
- Consider implementing content filtering for production use
- Monitor AI usage costs and implement quotas

## Performance

- **Cold Start**: ~50-100ms typical cold start time
- **Response Time**: Depends on AI model processing (typically 1-3 seconds)
- **Concurrency**: Scales automatically with Cloudflare Workers platform
- **Memory**: Uses minimal memory footprint

## Configuration

Key configuration in `wrangler.jsonc`:
```json
{
  "ai": {
    "binding": "AI"
  },
  "compatibility_date": "2025-06-28",
  "observability": {
    "enabled": true
  }
}
```