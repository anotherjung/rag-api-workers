/**
 * Base Agent class for implementing different retrieval strategies
 */
export class BaseAgent {
	constructor(name) {
		this.name = name;
	}

	/**
	 * Search for relevant documents
	 * @param {string} query - Search query
	 * @param {object} env - Cloudflare environment bindings
	 * @param {object} options - Search options
	 * @returns {Promise<Array>} - Search results
	 */
	async search(query, env, options = {}) {
		throw new Error("Search method must be implemented by subclass");
	}

	/**
	 * Normalize scores to 0-1 range
	 * @param {Array} results - Search results with scores
	 * @returns {Array} - Results with normalized scores
	 */
	normalizeScores(results) {
		if (!results || results.length === 0) return [];
		
		const maxScore = Math.max(...results.map(r => r.score || 0));
		if (maxScore === 0) return results;
		
		return results.map(result => ({
			...result,
			normalizedScore: (result.score || 0) / maxScore
		}));
	}

	/**
	 * Log agent activity
	 * @param {string} message - Log message
	 * @param {object} data - Additional data to log
	 */
	log(message, data = {}) {
		console.log(`[${this.name}] ${message}`, data);
	}
}