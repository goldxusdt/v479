
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return (error as any).message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unexpected error occurred';
}
