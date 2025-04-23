/**
 * Stability utilities to improve bot resilience
 * 
 * This module provides utilities to help prevent crashes and implement
 * graceful degradation when problems occur.
 */

/**
 * Safely execute a function with error handling
 * @param {Function} fn - Function to execute
 * @param {any[]} args - Arguments to pass to the function
 * @param {any} defaultValue - Value to return if the function fails
 * @param {string} errorContext - Context for error logging
 * @returns {Promise<any>} The function result or default value on error
 */
async function safeExecute(fn, args = [], defaultValue = null, errorContext = 'Unknown operation') {
    try {
        return await fn(...args);
    } catch (error) {
        console.error(`Error in ${errorContext}:`, error);
        return defaultValue;
    }
}

/**
 * Safe version of discord.js's interaction.reply
 * @param {Interaction} interaction - Discord interaction object
 * @param {Object} options - Reply options
 * @returns {Promise<void>}
 */
async function safeReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(options);
        } else {
            await interaction.reply(options);
        }
    } catch (error) {
        console.error('Error replying to interaction:', error);
        try {
            // Try one more time with a simplified message
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'There was an error executing the command. Please try again later.',
                    ephemeral: false 
                });
            }
        } catch (secondError) {
            console.error('Failed to send error message:', secondError);
        }
    }
}

/**
 * Safely access a Discord API entity with error handling
 * @param {Function} accessor - Function to access the entity
 * @param {any} defaultValue - Value to return if access fails
 * @returns {any} The accessed entity or default value
 */
function safeAccess(accessor, defaultValue = null) {
    try {
        return accessor();
    } catch (error) {
        console.error('Error accessing Discord entity:', error);
        return defaultValue;
    }
}

/**
 * Set interval with built-in error handling
 * @param {Function} callback - Function to execute
 * @param {number} delay - Delay in milliseconds
 * @param {string} taskName - Name of the task for logging
 * @returns {NodeJS.Timeout} Interval ID
 */
function safeInterval(callback, delay, taskName = 'scheduled task') {
    return setInterval(() => {
        try {
            callback();
        } catch (error) {
            console.error(`Error in ${taskName}:`, error);
            // Continue running the interval despite errors
        }
    }, delay);
}

/**
 * Create a promise that resolves after a timeout
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retries on failure
 * @param {Function} fn - Function to execute
 * @param {Object} options - Retry options
 * @returns {Promise<any>} The function result
 */
async function withRetry(fn, { maxRetries = 3, delay = 1000, backoff = 2, errorFilter = null } = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Skip retries if the error filter says so
            if (errorFilter && !errorFilter(error)) {
                throw error;
            }
            
            console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
            
            // Wait before the next attempt
            if (attempt < maxRetries) {
                await timeout(delay);
                delay *= backoff; // Exponential backoff
            }
        }
    }
    
    // All retries failed
    throw lastError;
}

/**
 * Check if a request error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} Whether the error is retryable
 */
function isRetryableError(error) {
    // Network errors are usually retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || 
        error.code === 'ESOCKETTIMEDOUT' || error.code === 'ECONNABORTED') {
        return true;
    }
    
    // Some Discord API errors are retryable (rate limits, server errors)
    if (error.code >= 500 || error.code === 429) {
        return true;
    }
    
    return false;
}

module.exports = {
    safeExecute,
    safeReply,
    safeAccess,
    safeInterval,
    timeout,
    withRetry,
    isRetryableError
};
