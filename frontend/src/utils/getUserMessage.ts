import { ApiError } from './ApiError';

const getUserMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "VALIDATION_ERROR":
        return error.message;
      case "NOT_FOUND":
        return "We couldn’t find that location. Try adding the country (e.g., “Dublin, Ireland”).";
      case "UPSTREAM_UNAVAILABLE":
        return "Service temporarily unavailable. Please try again in a moment.";
      case "UPSTREAM_BAD_RESPONSE":
        return "Provider error. Please try again.";
      default:
        if (error.status === 429) return "Too many requests right now. Please try again shortly.";
        if (error.status >= 500) return "Server problem. Please try again shortly.";
        if ([502, 503, 504].includes(error.status)) return "Service temporarily unavailable. Please try again in a moment.";
        return "There was an issue with the request. Please check your inputs and try again.";
    }
  }

  if (error instanceof TypeError) {
    return "Network error. Please check your connection and try again.";
  }

  if (error instanceof Error && error.message === "UNEXPECTED_RESPONSE_SHAPE") {
    return "The AI reply came back in an unexpected format. Please try again shortly.";
  }

  return "Something went wrong while generating your travel guide. Please try again shortly.";
};

export default getUserMessage;