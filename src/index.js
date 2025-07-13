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

// Create Hono app instance
const app = new Hono();

// Add CORS middleware
app.use("/*", cors());

// Error handling middleware
app.onError((err, c) => {
	console.error("Error:", err);
	return c.json({ 
		error: err.message,
		stack: c.env.DEBUG ? err.stack : undefined 
	}, 500);
});

// Health check endpoint
app.get("/health", (c) => {
	return c.json({ 
		status: "healthy",
		timestamp: new Date().toISOString()
	});
});

// Main RAG query endpoint - uses context from vector search
app.get("/", async (c) => {
	try {
		const question = c.req.query("text") || "What is the square root of 9?";
		const selectedModel = c.req.query("model") || "llama";
		const isLocal = c.req.header("host")?.includes("localhost");

		// Determine which model to use
		let modelName = "";
		if (selectedModel === "llama-70b") {
			// High-capability 70B parameter model for complex tasks
			modelName = "@cf/meta/llama-3.1-70b-instruct";
		} else {
			// Default lightweight model for fast responses
			modelName = "@cf/meta/llama-3.2-1b-instruct";
		}

		if (isLocal) {
			// Local development - simplified response
			const answer = await c.env.AI.run(modelName, {
				messages: [{ role: "user", content: question }]
			});
			c.header('x-model-used', modelName);
			return c.json({
				...answer,
				note: "Local mode - no vector search"
			});
		}

		// Generate embedding for the question
		const embeddings = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
			text: question
		});
		const vectors = embeddings.data[0];

		// Query Vectorize for similar content
		const vectorQuery = await c.env.VECTORIZE.query(vectors, { topK: 5 });
		
		// Extract matching note IDs
		const matchingIds = vectorQuery.matches
			?.filter(match => match.score > 0.5)
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

		// Add model header
		c.header('x-model-used', modelName);

		return c.json({
			answer,
			question,
			context: notes,
			matchCount: matchingIds.length
		});
	} catch (error) {
		console.error("RAG Query Error:", error);
		return c.json({ error: "Failed to process query" }, 500);
	}
});

// Create note endpoint
app.post("/notes", async (c) => {
	try {
		const { text } = await c.req.json();
		
		if (!text || typeof text !== "string") {
			return c.json({ error: "Invalid text provided" }, 400);
		}

		// Check if running locally
		const isLocal = c.req.header("host")?.includes("localhost");
		
		if (isLocal) {
			// Local development - return mock response
			return c.json({ 
				success: true,
				message: "Text received successfully",
				text: text,
				note: "Workflow processing disabled in local dev",
				isLocal: true
			}, 201);
		}

		// Production - create workflow  
		const instance = await c.env.RAG_WORKFLOW.create({
			params: { text }
		});

		return c.json({ 
			success: true,
			workflowId: instance.id,
			message: "Note processing started",
			text: text
		}, 201);
	} catch (error) {
		console.error("Notes Error:", error);
		return c.json({ error: "Failed to create note" }, 500);
	}
});


// Search endpoint with full RAG capabilities
app.get("/search", async (c) => {
	try {
		const query = c.req.query("q");
		
		if (!query) {
			return c.json({ error: "Query parameter 'q' is required" }, 400);
		}

		// Check if running locally
		const isLocal = c.req.header("host")?.includes("localhost");
		
		if (isLocal) {
			// Local development - return mock response
			return c.json({
				message: "Search functionality temporarily disabled in local dev",
				query: query,
				note: "Vectorize local bindings not yet supported",
				isLocal: true,
				results: []
			});
		}

		// Production - perform vector search with context
		// Generate query embedding
		const queryEmbedding = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
			text: query
		});
		
		// Search similar vectors
		const matches = await c.env.VECTORIZE.query(queryEmbedding.data[0], {
			topK: 10,
			returnMetadata: true
		});
		
		// Get full text and metadata for matches from D1
		const results = [];
		for (const match of matches.matches) {
			if (match.score < 0.5) continue; // Filter low-relevance results
			
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
		
		return c.json({
			query,
			count: results.length,
			results
		});
	} catch (error) {
		console.error("Search Error:", error);
		return c.json({ error: "Search service unavailable" }, 503);
	}
});

// Delete note endpoint - removes both database record and vector
app.delete("/notes/:id", async (c) => {
	try {
		const { id } = c.req.param();
		
		if (!id) {
			return c.json({ error: "Note ID is required" }, 400);
		}

		// Check if running locally
		const isLocal = c.req.header("host")?.includes("localhost");
		
		if (isLocal) {
			// Local development - return mock response
			return c.json({ 
				message: "Delete functionality disabled in local dev",
				noteId: id,
				note: "Vectorize local bindings not yet supported",
				isLocal: true
			});
		}

		// Production - delete from both D1 and Vectorize
		// Delete from D1 database
		const query = `DELETE FROM notes WHERE id = ?`;
		const result = await c.env.DB.prepare(query).bind(id).run();
		
		// Delete from Vectorize
		await c.env.VECTORIZE.deleteByIds([id]);
		
		// Return 204 No Content on successful deletion
		return c.status(204);
	} catch (error) {
		console.error("Delete Error:", error);
		return c.json({ error: "Failed to delete note" }, 500);
	}
});

// 404 handler
app.notFound((c) => {
	return c.json({ error: "Not found" }, 404);
});

export default app;