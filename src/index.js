/**
 * RAG AI Tutorial - Cloudflare Workers with Hono
 * 
 * This worker implements a Retrieval-Augmented Generation (RAG) system
 * using Cloudflare's AI, D1, Vectorize, and Workflows
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { RAGWorkflow } from "./vectorize";
import { vectorAgent } from "./agents/vector-agent";

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

// Default route - AI demo
app.get("/", async (c) => {
	try {
		const answer = await c.env.AI.run("@cf/meta/llama-3.2-1b-instruct", {
			messages: [{ role: "user", content: "What is the square root of 9?" }]
		});
		return c.json(answer);
	} catch (error) {
		console.error("AI Error:", error);
		return c.json({ error: "AI service unavailable" }, 503);
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
			payload: { text } 
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

// Search endpoint
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

		// Production - use vector agent for search
		const searchResults = await vectorAgent.search(query, c.env, { 
			topK: 5,
			threshold: 0.5 
		});
		
		// Get full text for matches from D1
		const results = [];
		for (const result of searchResults) {
			const { results: notes } = await c.env.DB.prepare(
				"SELECT * FROM notes WHERE id = ?"
			).bind(result.id).all();
			
			if (notes.length > 0) {
				results.push({
					id: result.id,
					score: result.score,
					normalizedScore: result.normalizedScore,
					text: notes[0].text,
					metadata: result.metadata,
					agent: result.agent
				});
			}
		}
		
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

// 404 handler
app.notFound((c) => {
	return c.json({ error: "Not found" }, 404);
});

export default app;