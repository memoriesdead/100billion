import { useState, useCallback } from 'react';

// Define the structure for the MCP tool response (adjust as needed based on actual system tool)
interface McpToolResult {
  // Define expected properties of a successful result
  // This might vary, so keep it flexible or type per tool if possible
  [key: string]: unknown;
}

interface McpToolError {
  message: string;
  // Add other potential error properties
  code?: string;
}

// This is a placeholder type for the actual system tool function
// In a real scenario, this would be provided by the environment/SDK
type SystemUseMcpTool = (args: {
  server_name: string;
  tool_name: string;
  arguments: Record<string, unknown>;
}) => Promise<McpToolResult>; // Assuming the system tool returns a promise

// Placeholder implementation - replace with actual system interaction
const systemUseMcpToolPlaceholder: SystemUseMcpTool = async ({ server_name, tool_name, arguments: args }) => {
  console.log(`[useMcpTool Hook] Calling MCP Tool: ${server_name}/${tool_name}`, args);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // --- Mock Responses (Replace with actual system tool call) ---
  // This part needs to be replaced by the actual mechanism
  // that invokes the <use_mcp_tool> tag and returns its result.
  // For now, we mock based on tool name for demonstration.
  if (server_name === 'github.com/stripe/agent-toolkit') {
    if (tool_name === 'create_product') {
      console.log('[useMcpTool Hook] Mocking Stripe create_product success');
      return { id: `prod_mock_${Date.now()}`, object: 'product', name: args.name };
    }
    if (tool_name === 'create_price') {
       console.log('[useMcpTool Hook] Mocking Stripe create_price success');
       return { id: `price_mock_${Date.now()}`, object: 'price', product: args.product, unit_amount: args.unit_amount };
    }
    // Add mocks for other tools if needed during development
  }

  console.warn(`[useMcpTool Hook] No mock response for ${server_name}/${tool_name}`);
  // Simulate an error for unmocked tools or based on specific args
  // throw new Error(`MCP tool ${tool_name} on server ${server_name} call failed (mock error).`);
  return { warning: 'No mock response configured for this tool call.' };
  // --- End Mock Responses ---
};


export function useMcpTool(serverName: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<McpToolError | null>(null);
  const [data, setData] = useState<McpToolResult | null>(null);

  const callTool = useCallback(
    async (toolName: string, args: Record<string, unknown>): Promise<McpToolResult | null> => {
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        // Replace placeholder with the actual system call mechanism
        const result = await systemUseMcpToolPlaceholder({
          server_name: serverName,
          tool_name: toolName,
          arguments: args,
        });
        setData(result);
        setIsLoading(false);
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[useMcpTool Hook] Error calling ${serverName}/${toolName}:`, err);
        setError({ message: message });
        setIsLoading(false);
        // Re-throw or return null/error object based on desired error handling
        // throw err; // Option 1: Re-throw
        return null; // Option 2: Return null on error
      }
    },
    [serverName] // Dependency array includes serverName
  );

  return { callTool, isLoading, error, data };
}
