import { BaseAgent } from './base-agent';

/**
 * Vector Search Agent - Performs semantic similarity search using embeddings
 */
export class VectorAgent extends BaseAgent {
	constructor() {
		super('VectorAgent');
		this.embeddingModel = '@cf/baai/bge-base-en-v1.5';
		this.defaultTopK = 10;
	}

	/**
	 * Search for documents using vector similarity
	 * @param {string} query - Search query
	 * @param {object} env - Cloudflare environment bindings
	 * @param {object} options - Search options
	 * @returns {Promise<Array>} - Search results with similarity scores
	 */
	async search(query, env, options = {}) {
		const { topK = this.defaultTopK, threshold = 0.7 } = options;
		
		try {
			this.log('Starting vector search', { query, topK, threshold });

			// Generate query embedding
			const startTime = Date.now();
			const queryEmbedding = await this.generateEmbedding(query, env);
			const embeddingTime = Date.now() - startTime;
			
			this.log('Generated query embedding', { 
				dimensions: queryEmbedding.length,
				time: embeddingTime 
			});

			// Search in Vectorize
			const searchStart = Date.now();
			const searchResults = await env.VECTORIZE.query(queryEmbedding, {
				topK,
				returnMetadata: true
			});
			const searchTime = Date.now() - searchStart;

			this.log('Vector search completed', {
				matches: searchResults.matches.length,
				time: searchTime
			});

			// Filter by threshold and format results
			const results = searchResults.matches
				.filter(match => match.score >= threshold)
				.map(match => ({
					id: match.id,
					score: match.score,
					metadata: match.metadata || {},
					source: 'vector',
					agent: this.name
				}));

			return this.normalizeScores(results);
		} catch (error) {
			this.log('Vector search error', { error: error.message });
			throw new Error(`Vector search failed: ${error.message}`);
		}
	}

	/**
	 * Generate embedding for text
	 * @param {string} text - Text to embed
	 * @param {object} env - Environment bindings
	 * @returns {Promise<Array<number>>} - Embedding vector
	 */
	async generateEmbedding(text, env) {
		try {
			const response = await env.AI.run(this.embeddingModel, { text });
			
			if (!response || !response.data || !response.data[0]) {
				throw new Error('Invalid embedding response');
			}
			
			return response.data[0];
		} catch (error) {
			throw new Error(`Embedding generation failed: ${error.message}`);
		}
	}

	/**
	 * Batch search for multiple queries
	 * @param {Array<string>} queries - Multiple search queries
	 * @param {object} env - Environment bindings
	 * @param {object} options - Search options
	 * @returns {Promise<Map>} - Map of query to results
	 */
	async batchSearch(queries, env, options = {}) {
		const results = new Map();
		
		// Process queries in parallel with concurrency limit
		const concurrency = 3;
		for (let i = 0; i < queries.length; i += concurrency) {
			const batch = queries.slice(i, i + concurrency);
			const batchResults = await Promise.all(
				batch.map(query => this.search(query, env, options))
			);
			
			batch.forEach((query, idx) => {
				results.set(query, batchResults[idx]);
			});
		}
		
		return results;
	}
}

// Export singleton instance
export const vectorAgent = new VectorAgent();