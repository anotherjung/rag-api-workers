# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Workers project following the RAG (Retrieval-Augmented Generation) AI tutorial. The project uses Cloudflare's AI Workers binding to create an AI-powered worker that can process requests and generate responses using the Llama 3B model.

## Development Commands

### Core Development
- `npm run dev` or `npm start` - Start local development server with Wrangler
- `npx wrangler dev --remote` - Run development server with remote resources (as noted in R1.md)
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm test` - Run tests with Vitest

### Testing
- Tests use Vitest with Cloudflare Workers pool for integration testing
- Test configuration is in `vitest.config.js` which references `wrangler.jsonc`
- Tests include both unit-style and integration-style examples

## Architecture

### Project Structure
- `src/index.js` - Main worker entry point with AI binding usage
- `test/index.spec.js` - Test files using Cloudflare Workers test utilities
- `wrangler.jsonc` - Cloudflare Workers configuration with AI binding enabled
- `vitest.config.js` - Test configuration for Workers environment

### Key Technologies
- **Cloudflare Workers** - Serverless execution environment
- **Cloudflare AI** - AI inference binding (`@cf/meta/llamma-3b-instruct` model)
- **Vitest** - Testing framework with Workers-specific pool
- **Wrangler** - Cloudflare Workers CLI tool

### Current Implementation
The worker currently demonstrates basic AI model usage by:
1. Receiving HTTP requests
2. Calling the Cloudflare AI binding with a hardcoded question
3. Returning the AI response as JSON

### AI Binding Configuration
- AI binding is enabled in `wrangler.jsonc` with `"ai": { "binding": "AI" }`
- Accessed in code via `env.AI.run()` method
- Currently configured to use `@cf/meta/llamma-3b-instruct` model

## Development Notes

- This project follows the Cloudflare Workers RAG AI tutorial structure
- Observability is enabled in the Wrangler configuration
- The test setup includes both unit and integration testing patterns for Workers
- Configuration uses JSONC format for Wrangler settings with extensive documentation comments