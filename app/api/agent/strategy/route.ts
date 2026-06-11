import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { getAIKeyForModule, AI_MODELS } from '@/lib/ai-config';
import { Redis } from '@upstash/redis';
import { tavily } from '@tavily/core';

// Initialize Redis for caching
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

// Zod schemas for structured output
const StrategySchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low', 'Strategic']),
  timeframe: z.string(),
  costEstimate: z.string(),
  impactReduction: z.string(),
  status: z.enum(['ready', 'planning', 'recommended', 'in-progress', 'completed']),
  category: z.enum(['immediate', 'shortTerm', 'longTerm']),
  feasibility: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  dependencies: z.array(z.string()),
  riskFactors: z.array(z.string()),
  successMetrics: z.array(z.string()),
  resourceRequirements: z.object({
    personnel: z.number(),
    equipment: z.array(z.string()),
    partnerships: z.array(z.string()),
  })
});

const StrategyResponseSchema = z.object({
  immediate: z.array(StrategySchema),
  shortTerm: z.array(StrategySchema),
  longTerm: z.array(StrategySchema),
  riskMitigationMetrics: z.object({
    currentRisk: z.number(),
    targetRisk: z.number(),
    costToImplement: z.string(),
    expectedROI: z.string(),
    paybackPeriod: z.string(),
    riskReduction: z.string(),
  }),
  keyInsights: z.array(z.string()),
  marketIntelligence: z.array(z.string()),
  bestPractices: z.array(z.string()),
  contingencyPlans: z.array(z.string()),
});

class ProductionStrategyAgent {
  async conductComprehensiveStrategyAnalysis(simulationId: string) {
    console.log(`[STRATEGY-AGENT] 🚀 Analysis for simulation: ${simulationId}`);
    
    try {
      // 1. Fetch simulation and supply chain details
      const { data: simulation, error: simError } = await supabaseServer
        .from('simulations')
        .select('*, supply_chains(*)')
        .eq('simulation_id', simulationId)
        .single();

      if (simError || !simulation) throw new Error("Simulation or Supply Chain not found");

      // 2. Fetch impact results
      const { data: impactResults } = await supabaseServer
        .from('impact_results')
        .select('*')
        .eq('simulation_id', simulationId);

      // 3. Optional: Gather Tavily Intel
      let marketIntel = "";
      if (process.env.TAVILY_API_KEY) {
        try {
          const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
          const intel = await tavilyClient.search(`supply chain resilience mitigation strategies for ${simulation.scenario_type || 'disruption'}`, { searchDepth: "basic", maxResults: 2 });
          marketIntel = JSON.stringify(intel.results);
        } catch (e) {
          console.warn("Tavily search failed or skipped", e);
        }
      }

      // 4. Prepare Prompt
      const prompt = `
        Disruption Scenario: ${simulation.name} (${simulation.scenario_type})
        Supply Chain: ${simulation.supply_chains?.name || 'Unknown'}
        Impact Assessment: ${JSON.stringify(impactResults || [])}
        Market Context (Recent News/Research): ${marketIntel}
        
        Generate a highly actionable and data-driven strategic mitigation plan to minimize the impact of this disruption.
        Ensure you include immediate (0-24h), short-term (1-30d), and long-term (30d+) strategies.
        Include detailed feasibility, cost estimates, risk factors, and success metrics for each strategy.
      `;

      // Configure the model using centralized settings
      const google = createGoogleGenerativeAI({
        apiKey: getAIKeyForModule("agents"),
      });

      // 5. Execute via generateObject
      const result = await generateObject({
        model: google(AI_MODELS.agents),
        schema: StrategyResponseSchema,
        prompt: prompt,
        maxTokens: 4000,
        temperature: 0.3,
      });

      const strategyAnalysis = {
        ...result.object,
        enhanced: true,
        processingTime: Date.now()
      };

      // 6. Update simulation with result summary
      await supabaseServer
        .from('simulations')
        .update({
          result_summary: {
            ...simulation.result_summary, // Preserve existing result summary (like impact assessment)
            strategyAnalysis: {
              ...strategyAnalysis,
              strategy_timestamp: new Date().toISOString()
            }
          }
        })
        .eq('simulation_id', simulationId);

      return strategyAnalysis;
    } catch (error) {
      console.error('[STRATEGY-AGENT] ❌ Error:', error);
      throw error;
    }
  }
}

// API Routes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { simulationId } = body;
    
    if (!simulationId) return NextResponse.json({ error: "Missing simulationId" }, { status: 400 });

    const agent = new ProductionStrategyAgent();
    const result = await agent.conductComprehensiveStrategyAnalysis(simulationId);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal Error" 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const simulationId = searchParams.get('simulationId');
  if (!simulationId) return NextResponse.json({ error: "Missing simulationId" }, { status: 400 });

  try {
    // Check cache first
    const cacheKey = `strategy:${simulationId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, data: cached });
      }
    } catch (e) {
      console.warn("Redis read failed", e);
    }

    const agent = new ProductionStrategyAgent();
    const result = await agent.conductComprehensiveStrategyAnalysis(simulationId);
    
    // Save to cache
    try {
      await redis.setex(cacheKey, 3600, result);
    } catch (e) {
      console.warn("Redis write failed", e);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal Error" 
    }, { status: 500 });
  }
}
