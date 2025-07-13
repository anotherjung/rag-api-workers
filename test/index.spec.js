import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('RAG AI Worker Tests', () => {
	describe('Health Check', () => {
		it('should return healthy status', async () => {
			const request = new Request('http://example.com/health');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe('healthy');
			expect(data.timestamp).toBeDefined();
		});
	});

	describe('Default Route', () => {
		it('should return AI response', async () => {
			const request = new Request('http://example.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(200);
			const data = await response.json();
			// AI response should have some structure
			expect(data).toBeDefined();
		});
	});

	describe('Notes Endpoint', () => {
		it('should accept valid text input', async () => {
			const request = new Request('http://localhost:8787/notes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Host': 'localhost:8787',
				},
				body: JSON.stringify({ text: 'Test note content' }),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.text).toBe('Test note content');
			// In local dev, should return mock response
			expect(data.isLocal).toBe(true);
		});

		it('should reject invalid text input', async () => {
			const request = new Request('http://localhost:8787/notes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ text: 123 }), // Invalid: not a string
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid text provided');
		});

		it('should reject empty body', async () => {
			const request = new Request('http://localhost:8787/notes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({}),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe('Invalid text provided');
		});
	});

	describe('Search Endpoint', () => {
		it('should handle search query', async () => {
			const request = new Request('http://localhost:8787/search?q=test+query', {
				headers: {
					'Host': 'localhost:8787',
				},
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.query).toBe('test query');
			// In local dev, should return mock response
			expect(data.isLocal).toBe(true);
			expect(data.results).toEqual([]);
		});

		it('should reject missing query parameter', async () => {
			const request = new Request('http://localhost:8787/search');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.error).toBe("Query parameter 'q' is required");
		});
	});

	describe('404 Handler', () => {
		it('should return 404 for unknown routes', async () => {
			const request = new Request('http://example.com/unknown-route');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('Not found');
		});
	});
});