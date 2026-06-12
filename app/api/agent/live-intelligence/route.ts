import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getAIKeyForModule } from '@/lib/ai-config';
import { tavily } from '@tavily/core';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: getAIKeyForModule('agents'),
});

const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY
});

const LiveIntelligenceSchema = z.object({
  disruptionsFound: z.boolean().describe('True if any live disruptions were found affecting the specified nodes'),
  disruptedNodeId: z.string().nullable().describe('The ID of the node affected by the disruption, or null if none'),
  description: z.string().describe('A summary of the live news event affecting the node')
});

export async function POST(req: NextRequest) {
  let nodes: any[] = [];
  try {
    const body = await req.json();
    nodes = body.nodes || [];

    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ error: 'nodes are required' }, { status: 400 });
    }

    // Combine node names for a targeted search
    const nodeNames = nodes.map((n: any) => n.data.label).filter(Boolean);
    const searchQuery = `supply chain disruption logistics news ${nodeNames.join(' OR ')}`;

    console.log('🔍 Scanning live intelligence for nodes:', nodeNames);

    let searchContext = "";
    try {
      const searchResult = await tavilyClient.search(searchQuery, { topic: 'news', days: 2, maxResults: 3 });
      searchContext = searchResult.results.map(r => `${r.title}: ${r.content}`).join('\n');
    } catch (err) {
      console.warn('Tavily search failed or missing API key, proceeding with fallback:', err);
    }

    const prompt = `
    You are a Supply Chain Intelligence Agent.
    Review the following live news context and determine if ANY of the specific supply chain nodes are currently experiencing a disruption.
    
    Nodes in our supply chain:
    ${JSON.stringify(nodes.map((n:any) => ({ id: n.id, name: n.data.label })))}

    Live News Context:
    ${searchContext || "No severe live news reported. The global supply chain appears stable."}

    If you find a disruption affecting a specific node, set disruptionsFound to true, provide the node ID, and summarize the issue.
    If no disruption is found, set disruptionsFound to false.
    `;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: LiveIntelligenceSchema,
      prompt: prompt,
      temperature: 0.1,
    });

    return NextResponse.json(object);
  } catch (error: any) {
    const errMsg: string = error?.message || '';
    const isRateLimit = errMsg.includes('quota') || errMsg.includes('rate') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.toLowerCase().includes('overloaded');
    
    if (isRateLimit) {
      console.warn('⚠️ AI quota/overload exceeded — using fallback live intelligence data');
      
      // For demo purposes, if rate limited, pick a node and simulate a disruption
      const mockNode = nodes && nodes.length > 0 ? nodes[0] : null;
      
      if (mockNode) {
        return NextResponse.json({
          disruptionsFound: true,
          disruptedNodeId: mockNode.id,
          description: `(Fallback Demo) Breaking News: Significant operational delays reported at ${mockNode.data?.label || 'this node'} due to unforeseen local circumstances. AI rate limits currently active.`
        });
      }

      return NextResponse.json({
        disruptionsFound: false,
        disruptedNodeId: null,
        description: "AI rate limits currently active. Unable to scan live feeds."
      });
    }

    console.error('Error in live intelligence scan:', error);
    return NextResponse.json({ error: errMsg || 'Failed to scan live intelligence' }, { status: 500 });
  }
}
