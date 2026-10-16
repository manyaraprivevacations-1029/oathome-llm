export type RetryDecision = {
  shouldRetry: boolean;
  attemptNumber: number;
  maxAttempts: number;
  nextAttemptReason?: string;
};

export function decideRetry(
  status: "no_answer" | "busy" | "failed" | "completed",
  attemptNumber: number,
  maxAttempts: number,
): RetryDecision {
  if (status === "completed") {
    return { shouldRetry:false, attemptNumber, maxAttempts };
  }

  if (attemptNumber >= maxAttempts) {
    return { shouldRetry:false, attemptNumber, maxAttempts, nextAttemptReason:"Maximum attempts reached." };
  }

  if (status === "no_answer" || status === "busy" || status === "failed") {
    return {
      shouldRetry:true,
      attemptNumber: attemptNumber + 1,
      maxAttempts,
      nextAttemptReason:"Retry according to the campaign's configured calling window.",
    };
  }

  return { shouldRetry:false, attemptNumber, maxAttempts };
}
