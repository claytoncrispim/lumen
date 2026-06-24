export async function safeJsonParse(response: Response): Promise<any> {
  try {
    // Attempt to parse the response as JSON
    return await response.json();
  } catch (error) {
    // If parsing fails, log the error and return null
    console.error('Failed to parse JSON:', error);
    return null;
  }
}
