import { WorkflowEntrypoint } from "cloudflare:workers";

/**
 * RAG Workflow for processing and indexing text documents
 * 
 * This workflow:
 * 1. Stores text in D1 database
 * 2. Generates embeddings using AI
 * 3. Stores vectors in Vectorize for semantic search
 */
export class RAGWorkflow extends WorkflowEntrypoint {
	async run(event, step) {
		const env = this.env;
		const { text, metadata = {} } = event.payload;

		// Validate input
		if (!text || typeof text !== "string") {
			throw new Error("Invalid text provided to workflow");
		}

		// Step 1: Create database record
		const record = await step.do("create database record", async () => {
			try {
				const query = "INSERT INTO notes (text, metadata) VALUES (?, ?) RETURNING *";
				const { results } = await env.DB.prepare(query)
					.bind(text, JSON.stringify(metadata))
					.run();

				const record = results[0];
				if (!record) {
					throw new Error("Failed to create database record");
				}

				console.log(`Created database record with ID: ${record.id}`);
				return record;
			} catch (error) {
				console.error("Database error:", error);
				throw new Error(`Database operation failed: ${error.message}`);
			}
		});

		// Step 2: Generate embedding
		const embedding = await step.do("generate embedding", async () => {
			try {
				const embeddings = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
					text: text
				});

				if (!embeddings || !embeddings.data || !embeddings.data[0]) {
					throw new Error("Invalid embedding response from AI");
				}

				const values = embeddings.data[0];
				console.log(`Generated embedding with ${values.length} dimensions`);
				return values;
			} catch (error) {
				console.error("Embedding error:", error);
				throw new Error(`Embedding generation failed: ${error.message}`);
			}
		});

		// Step 3: Insert vector into Vectorize
		await step.do("insert vector", async () => {
			try {
				const vectorData = {
					id: record.id.toString(),
					values: embedding,
					metadata: {
						text: text.substring(0, 1000), // Store first 1000 chars in metadata
						timestamp: new Date().toISOString(),
						...metadata
					}
				};

				await env.VECTORIZE.upsert([vectorData]);
				console.log(`Inserted vector for record ID: ${record.id}`);
			} catch (error) {
				console.error("Vectorize error:", error);
				throw new Error(`Vector insertion failed: ${error.message}`);
			}
		});

		// Return success with record details
		return {
			success: true,
			recordId: record.id,
			text: text,
			metadata: metadata,
			timestamp: new Date().toISOString()
		};
	}
}