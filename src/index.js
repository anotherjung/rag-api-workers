/**
 * RAG AI Tutorial - Cloudflare Workers with Hono
 * 
 * This worker implements a Retrieval-Augmented Generation (RAG) system
 * using Cloudflare's AI, D1, Vectorize, and Workflows
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { RAGWorkflow } from "./vectorize";

// Export workflow for registration
export { RAGWorkflow };

// Constants
const SIMILARITY_THRESHOLD = 0.5;
const DEFAULT_QUESTION = "describe Machine Learning ?";
const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
const DEFAULT_MODEL = "@cf/meta/llama-3.2-1b-instruct";
const ADVANCED_MODEL = "@cf/meta/llama-3.1-70b-instruct";

// Create Hono app instance
const app = new Hono();

// Utilities
const isLocalEnvironment = (c) => c.req.header("host")?.includes("localhost");

const createResponse = (data, status = 200, headers = {}) => {
	return {
		data,
		status,
		headers: {
			'Content-Type': 'application/json',
			'X-Timestamp': new Date().toISOString(),
			...headers
		}
	};
};

const handleError = (c, error, message, status = 500) => {
	console.error(`${message}:`, error);
	return c.json({ 
		error: message,
		details: c.env.DEBUG ? error.message : undefined,
		timestamp: new Date().toISOString()
	}, status);
};

// Add CORS middleware
app.use("/*", cors());

// Error handling middleware
app.onError((err, c) => {
	return handleError(c, err, "Internal server error");
});

// Commands endpoint - for UI command palette integration
app.get("/commands", (c) => {
	const commands = [
		{
			id: "query",
			name: "Ask Question",
			description: "Ask AI a question with context from your knowledge base",
			endpoint: "GET /?text={query}&model={llama|llama-70b}",
			parameters: [
				{ name: "text", type: "string", required: true, description: "Your question" },
				{ name: "model", type: "string", required: false, description: "AI model to use", options: ["llama", "llama-70b"] }
			],
			category: "AI",
			icon: "🤖"
		},
		{
			id: "create_note",
			name: "Add Note",
			description: "Add a new note to your knowledge base",
			endpoint: "POST /notes",
			parameters: [
				{ name: "text", type: "string", required: true, description: "Note content" }
			],
			category: "Knowledge",
			icon: "📝"
		},
		{
			id: "search",
			name: "Search Knowledge",
			description: "Search your knowledge base using semantic similarity",
			endpoint: "GET /search?q={query}",
			parameters: [
				{ name: "q", type: "string", required: true, description: "Search query" }
			],
			category: "Search",
			icon: "🔍"
		},
		{
			id: "delete_note",
			name: "Delete Note",
			description: "Remove a note from your knowledge base",
			endpoint: "DELETE /notes/{id}",
			parameters: [
				{ name: "id", type: "string", required: true, description: "Note ID" }
			],
			category: "Knowledge",
			icon: "🗑️"
		},
		{
			id: "health",
			name: "Health Check",
			description: "Check system status and availability",
			endpoint: "GET /health",
			parameters: [],
			category: "System",
			icon: "❤️"
		}
	];

	return c.json({
		commands,
		count: commands.length,
		categories: [...new Set(commands.map(cmd => cmd.category))],
		timestamp: new Date().toISOString()
	});
});

// Health check endpoint
app.get("/health", (c) => {
	const response = createResponse({
		status: "healthy",
		environment: isLocalEnvironment(c) ? "local" : "production",
		services: {
			ai: true,
			database: true,
			vectorize: !isLocalEnvironment(c),
			workflows: !isLocalEnvironment(c)
		}
	});
	
	Object.entries(response.headers).forEach(([key, value]) => {
		c.header(key, value);
	});
	
	return c.json(response.data);
});

// Main RAG query endpoint - uses context from vector search
app.get("/", async (c) => {
	try {
		const question = c.req.query("text") || DEFAULT_QUESTION;
		const selectedModel = c.req.query("model") || "llama";
		const isLocal = isLocalEnvironment(c);

		// Determine which model to use
		const modelName = selectedModel === "llama-70b" ? ADVANCED_MODEL : DEFAULT_MODEL;

		if (isLocal) {
			// Local development - simplified response
			const answer = await c.env.AI.run(modelName, {
				messages: [{ role: "user", content: question }]
			});
			
			const response = createResponse({
				...answer,
				metadata: {
					environment: "local",
					modelUsed: modelName,
					vectorSearchEnabled: false,
					question
				}
			}, 200, { 'x-model-used': modelName });

			Object.entries(response.headers).forEach(([key, value]) => {
				c.header(key, value);
			});
			
			return c.json(response.data);
		}

		// Generate embedding for the question
		const embeddings = await c.env.AI.run(EMBEDDING_MODEL, {
			text: question
		});
		const vectors = embeddings.data[0];

		// Query Vectorize for similar content
		const vectorQuery = await c.env.VECTORIZE.query(vectors, { topK: 5 });
		
		// Extract matching note IDs
		const matchingIds = vectorQuery.matches
			?.filter(match => match.score > SIMILARITY_THRESHOLD)
			?.map(match => match.id) || [];

		// Retrieve notes from D1
		let notes = [];
		if (matchingIds.length > 0) {
			const placeholders = matchingIds.map(() => '?').join(',');
			const query = `SELECT * FROM notes WHERE id IN (${placeholders})`;
			const { results } = await c.env.DB.prepare(query)
				.bind(...matchingIds)
				.all();
			if (results) {
				notes = results.map(note => note.text);
			}
		}

		// Build context message
		const contextMessage = notes.length
			? `Context:\n${notes.map(note => `- ${note}`).join("\n")}`
			: "";

		const systemPrompt = "When answering the question or responding, use the context provided, if it is provided and relevant.";

		// Generate response with selected model
		const { response: answer } = await c.env.AI.run(
			modelName,
			{
				messages: [
					...(notes.length ? [{ role: "system", content: contextMessage }] : []),
					{ role: "system", content: systemPrompt },
					{ role: "user", content: question }
				]
			}
		);

		// Create structured response
		const response = createResponse({
			answer,
			question,
			context: notes,
			metadata: {
				environment: "production",
				modelUsed: modelName,
				vectorSearchEnabled: true,
				matchCount: matchingIds.length,
				contextFound: notes.length > 0,
				similarityThreshold: SIMILARITY_THRESHOLD
			}
		}, 200, { 'x-model-used': modelName });

		Object.entries(response.headers).forEach(([key, value]) => {
			c.header(key, value);
		});

		return c.json(response.data);
	} catch (error) {
		return handleError(c, error, "Failed to process query");
	}
});

// Create note endpoint
app.post("/notes", async (c) => {
	try {
		const { text } = await c.req.json();
		
		if (!text || typeof text !== "string" || text.trim().length === 0) {
			return c.json({ error: "Valid text content is required" }, 400);
		}

		const isLocal = isLocalEnvironment(c);
		
		if (isLocal) {
			// Local development - return mock response
			const response = createResponse({
				success: true,
				message: "Text received successfully",
				text: text.trim(),
				metadata: {
					environment: "local",
					workflowEnabled: false,
					characterCount: text.trim().length
				}
			}, 201);

			Object.entries(response.headers).forEach(([key, value]) => {
				c.header(key, value);
			});

			return c.json(response.data);
		}

		// Production - create workflow  
		const instance = await c.env.RAG_WORKFLOW.create({
			params: { text: text.trim() }
		});

		const response = createResponse({
			success: true,
			workflowId: instance.id,
			message: "Note processing started",
			text: text.trim(),
			metadata: {
				environment: "production",
				workflowEnabled: true,
				characterCount: text.trim().length,
				processingStatus: "initiated"
			}
		}, 201);

		Object.entries(response.headers).forEach(([key, value]) => {
			c.header(key, value);
		});

		return c.json(response.data);
	} catch (error) {
		return handleError(c, error, "Failed to create note");
	}
});


// Search endpoint with full RAG capabilities
app.get("/search", async (c) => {
	try {
		const query = c.req.query("q");
		
		if (!query || query.trim().length === 0) {
			return c.json({ error: "Query parameter 'q' is required and cannot be empty" }, 400);
		}

		const isLocal = isLocalEnvironment(c);
		const trimmedQuery = query.trim();
		
		if (isLocal) {
			// Local development - return mock response
			const response = createResponse({
				query: trimmedQuery,
				count: 0,
				results: [],
				metadata: {
					environment: "local",
					vectorSearchEnabled: false,
					message: "Search functionality temporarily disabled in local dev"
				}
			});

			Object.entries(response.headers).forEach(([key, value]) => {
				c.header(key, value);
			});

			return c.json(response.data);
		}

		// Production - perform vector search with context
		// Generate query embedding
		const queryEmbedding = await c.env.AI.run(EMBEDDING_MODEL, {
			text: trimmedQuery
		});
		
		// Search similar vectors
		const matches = await c.env.VECTORIZE.query(queryEmbedding.data[0], {
			topK: 10,
			returnMetadata: true
		});
		
		// Get full text and metadata for matches from D1
		const results = [];
		for (const match of matches.matches) {
			if (match.score < SIMILARITY_THRESHOLD) continue; // Filter low-relevance results
			
			const { results: notes } = await c.env.DB.prepare(
				"SELECT * FROM notes WHERE id = ?"
			).bind(match.id).all();
			
			if (notes.length > 0) {
				results.push({
					id: match.id,
					score: match.score,
					text: notes[0].text,
					metadata: {
						...match.metadata,
						created_at: notes[0].created_at
					}
				});
			}
		}

		// Sort by score descending
		results.sort((a, b) => b.score - a.score);
		
		const response = createResponse({
			query: trimmedQuery,
			count: results.length,
			results,
			metadata: {
				environment: "production",
				vectorSearchEnabled: true,
				similarityThreshold: SIMILARITY_THRESHOLD,
				totalMatches: matches.matches?.length || 0,
				filteredMatches: results.length
			}
		});

		Object.entries(response.headers).forEach(([key, value]) => {
			c.header(key, value);
		});

		return c.json(response.data);
	} catch (error) {
		return handleError(c, error, "Search service unavailable", 503);
	}
});

// Delete note endpoint - removes both database record and vector
app.delete("/notes/:id", async (c) => {
	try {
		const { id } = c.req.param();
		
		if (!id || id.trim().length === 0) {
			return c.json({ error: "Note ID is required and cannot be empty" }, 400);
		}

		const isLocal = isLocalEnvironment(c);
		const trimmedId = id.trim();
		
		if (isLocal) {
			// Local development - return mock response
			const response = createResponse({
				message: "Delete functionality disabled in local dev",
				noteId: trimmedId,
				metadata: {
					environment: "local",
					vectorSearchEnabled: false,
					workflowEnabled: false
				}
			});

			Object.entries(response.headers).forEach(([key, value]) => {
				c.header(key, value);
			});

			return c.json(response.data);
		}

		// Production - delete from both D1 and Vectorize
		// Delete from D1 database
		const query = `DELETE FROM notes WHERE id = ?`;
		await c.env.DB.prepare(query).bind(trimmedId).run();
		
		// Delete from Vectorize
		await c.env.VECTORIZE.deleteByIds([trimmedId]);
		
		// Return 204 No Content on successful deletion
		c.header('X-Timestamp', new Date().toISOString());
		return c.status(204);
	} catch (error) {
		return handleError(c, error, "Failed to delete note");
	}
});

// Help endpoint - API documentation
app.get("/help", (c) => {
	const apiInfo = {
		name: "RAG AI Tutorial API",
		version: "1.0.0",
		description: "Retrieval-Augmented Generation system using Cloudflare AI, D1, and Vectorize",
		environment: isLocalEnvironment(c) ? "local" : "production",
		features: {
			aiQuery: "Ask questions with contextual knowledge retrieval",
			noteManagement: "Create, search, and delete notes in your knowledge base",
			semanticSearch: "Vector-based similarity search",
			commandDiscovery: "Structured command information for UI integration"
		},
		endpoints: {
			"GET /": "AI query with RAG context",
			"GET /commands": "Available commands for UI integration",
			"GET /health": "System health check",
			"GET /search": "Semantic search in knowledge base",
			"POST /notes": "Create new note",
			"DELETE /notes/:id": "Delete note",
			"GET /help": "This help information"
		},
		usage: {
			examples: [
				"GET /?text=What is machine learning&model=llama-70b",
				"POST /notes with {\"text\": \"Your knowledge here\"}",
				"GET /search?q=your search query"
			]
		}
	};

	const response = createResponse(apiInfo);
	
	Object.entries(response.headers).forEach(([key, value]) => {
		c.header(key, value);
	});
	
	return c.json(response.data);
});

// 404 handler
app.notFound((c) => {
	return c.json({ 
		error: "Not found",
		message: "The requested endpoint does not exist",
		availableEndpoints: ["/", "/commands", "/health", "/search", "/notes", "/help"],
		timestamp: new Date().toISOString()
	}, 404);
});

export default app;