import { safeJsonParse } from './safeJson';
import { ApiError } from './ApiError';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isRetryableError(error: any): boolean {
    // Fetch network errors are typically instances of TypeError
    if (error instanceof TypeError) return true;

    if (error instanceof ApiError) {
        // Consider 502, 503, and 504 as retryable server errors
        return [502, 503, 504].includes(error.status);
    }

    return false;
}

export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries: number = 2,
    delay: number = 4000
): Promise<any> {
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (response.ok) return response;

            const data = await safeJsonParse(response);

            const apiErr = new ApiError(
                data?.error?.message || `Request failed with status ${response.status}`,
                { 
                    status: response.status, 
                    code: data?.error?.code || 'UNKNOWN_ERROR', 
                    details: data?.error?.details }
            );

            if ([502, 503, 504].includes(response.status) && attempt < retries) {
                console.warn(
                `Request to ${url} failed with status ${response.status} (${apiErr.code}). Retrying in ${delay}ms... (Attempt ${
                    attempt + 1
                } of ${retries + 1})`
                );
                await sleep(delay);
                continue;
            }

            throw apiErr;

        } catch (error) {
            lastError = error;

            if (attempt < retries && isRetryableError(error)) {
                console.warn(
                    `Request to ${url} failed on attempt ${attempt + 1} of ${retries + 1}:`, error
                );            
                await sleep(delay);
                continue;
            } 

            throw error;
        }
    }
    
    // If exhausted all retries, throw the last error encountered
    throw lastError || new Error('Unknown error in fetchWithRetry');
}
    

