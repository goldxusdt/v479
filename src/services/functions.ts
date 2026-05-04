import { supabase } from '@/services/supabase';

export interface FunctionInvokeOptions {
  body?: any;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

/**
 * Robust wrapper for invoking Supabase Edge Functions.
 * Automatically parses error context and returns a user-friendly (error as any).message.
 */
export async function invokeEdgeFunction<T = any>(
  name: string,
  options?: FunctionInvokeOptions
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body: options?.body,
      headers: options?.headers,
      method: options?.method,
    });

    if (error) {
      let errorMsg = (error as any).message;
      try {
        if (error.context && typeof error.context.text === 'function') {
          const contextText = await error.context.text();
          try {
            const contextJson = JSON.parse(contextText);
            errorMsg = contextJson.error || contextJson.message || contextText;
          } catch (e) {
            errorMsg = contextText;
          }
        } else if (error.context && typeof error.context === 'string') {
          errorMsg = error.context;
        }
      } catch (e) {
        console.error(`Error parsing ${name} error context:`, e);
      }
      
      // If it's the generic Supabase error.message, try to make it better
      if (errorMsg === 'Edge Function returned a non-2xx status code') {
        errorMsg = `Server error in ${name}. Please try again later.`;
      }
      
      return { data: null, error: new Error(errorMsg) };
    }

    return { data: data as T, error: null };
  } catch (error: unknown) {
    console.error(`Unexpected exception invoking ${name}:`, error);
    return { data: null, error: error as Error };
  }
}
