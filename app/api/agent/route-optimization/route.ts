import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getAIKeyForModule } from '@/lib/ai-config';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: getAIKeyForModule('agents'),
});

const RouteOptimizationSchema = z.object({
  severity: z.enum(['Low', 'Medium', 'High']).describe('Severity of the disruption based on the description'),
  impactDescription: z.string().describe('A detailed 2-3 sentence analysis of the operational impact on the supply chain'),
  alternateRoutes: z.array(z.string()).describe('An array of 1 to 3 specific recommended alternate routes or mitigation steps')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nodeId, description, nodes, edges } = body;

    if (!nodeId || !description) {
      return NextResponse.json({ error: 'nodeId and description are required' }, { status: 400 });
    }

    const disruptedNode = nodes.find((n: any) => n.id === nodeId);
    const nodeName = disruptedNode?.data?.label || nodeId;

    console.log(`🧠 AI Agent Analyzing disruption at ${nodeName}: ${description}`);

    const prompt = `
    You are an expert Supply Chain Control Tower AI.
    A disruption has been reported at node: "${nodeName}".
    Problem description: "${description}"

    Analyze the impact of this disruption on the given supply chain network and suggest alternate routes.
    
    Supply Chain Context:
    Nodes: ${JSON.stringify(nodes.map((n:any) => ({ 
      id: n.id, 
      name: n.data.label, 
      type: n.type,
      preKnownRisks: n.data.hasPreKnownRisks ? n.data.riskExplanation : null 
    })))}
    Edges (Routes): ${JSON.stringify(edges.map((e:any) => ({ 
      from: e.source, 
      to: e.target,
      mode: e.data?.mode,
      historicalDisruptionsPerYear: e.data?.frequencyOfDisruptions,
      userDefinedAlternativeRoutes: e.data?.hasAltRoute ? e.data?.altRouteDetails : null
    })))}

    IMPORTANT: If the disrupted node or its connected routes have user-defined 'preKnownRisks' or 'userDefinedAlternativeRoutes' in the context data above, you MUST explicitly mention them in your analysis and prioritize them as your recommended alternate routes before suggesting new ones.
    Provide your analysis matching the schema exactly. Keep the alternate routes actionable and specific to the available nodes.
    `;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: RouteOptimizationSchema,
      prompt: prompt,
      temperature: 0.3, // Low temperature for consistent analysis
    });

    return NextResponse.json(object);
  } catch (error: any) {
    const errMsg: string = error?.message || '';
    const isRateLimit = errMsg.includes('quota') || errMsg.includes('rate') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.toLowerCase().includes('overloaded');
    
    if (isRateLimit) {
      console.warn('⚠️ AI quota/overload exceeded — using fallback route optimization data');
      return NextResponse.json({
        severity: 'High',
        impactDescription: `Simulation of disruption. Immediate downstream delays expected across connected nodes. AI rate limits currently active, displaying projected fallback analysis.`,
        alternateRoutes: [
          "Wait for conditions to clear.",
          "Check secondary nodes for capacity.",
          "Reroute critical shipments via nearest functional port."
        ]
      });
    }

    console.error('Error in route-optimization agent:', error);
    return NextResponse.json({ error: errMsg || 'Failed to process route optimization' }, { status: 500 });
  }
}
