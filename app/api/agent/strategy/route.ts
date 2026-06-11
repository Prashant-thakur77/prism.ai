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

      // 5. Execute via generateObject with retry and fallback
      let resultObject: any = null;
      let retries = 2;

      while (retries >= 0) {
        try {
          const result = await generateObject({
            model: google(AI_MODELS.agents),
            schema: StrategyResponseSchema,
            prompt: prompt + "\\n\\nCRITICAL: You must return a COMPLETE JSON object. Do not truncate your response.",
            maxTokens: 4000,
            temperature: 0.3,
          });
          resultObject = result.object;
          break; // Success
        } catch (error: any) {
          const errMsg: string = error?.message || '';
          const isRateLimit = errMsg.includes('quota') || errMsg.includes('rate') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.toLowerCase().includes('overloaded');
          
          if (isRateLimit) {
            console.error('[STRATEGY-AGENT] ❌ AI quota/overload exceeded — using fallback data:', errMsg);
            resultObject = generateFallbackStrategyData();
            break;
          }
          
          retries--;
          console.warn(`[STRATEGY-AGENT] ⚠️ AI generation failed. Retries left: ${retries}. Error:`, errMsg);
          if (retries < 0) {
            console.warn('[STRATEGY-AGENT] ❌ AI generation retries exhausted — using fallback data.');
            resultObject = generateFallbackStrategyData();
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (!resultObject) {
        resultObject = generateFallbackStrategyData();
      }

      const strategyAnalysis = {
        ...resultObject,
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

// Fallback data generator when AI is overloaded/rate-limited
function generateFallbackStrategyData() {
  return {
    immediate: [
      {
        id: 1,
        title: "Activate Alternative Transport Routes",
        description: "Immediately shift critical freight to secondary air and rail networks to bypass the disrupted nodes.",
        priority: "Critical",
        timeframe: "0-24 hours",
        costEstimate: "$100K - $150K",
        impactReduction: "40-60%",
        status: "recommended",
        category: "immediate",
        feasibility: "HIGH",
        dependencies: ["Carrier availability", "Customs clearance at secondary ports"],
        riskFactors: ["Higher spot market rates", "Secondary congestion"],
        successMetrics: ["Volume successfully rerouted", "Time saved vs waiting"],
        resourceRequirements: { personnel: 5, equipment: ["Cargo planes", "Trucks"], partnerships: ["3PL providers"] }
      }
    ],
    shortTerm: [
      {
        id: 2,
        title: "Reallocate Strategic Inventory",
        description: "Redistribute existing inventory from unaffected regional warehouses to balance fulfillment.",
        priority: "High",
        timeframe: "1-14 days",
        costEstimate: "$50K - $75K",
        impactReduction: "25-35%",
        status: "recommended",
        category: "shortTerm",
        feasibility: "HIGH",
        dependencies: ["Inventory visibility system", "Warehouse labor"],
        riskFactors: ["Stockouts in secondary regions"],
        successMetrics: ["Fulfillment rate maintained", "Customer SLA compliance"],
        resourceRequirements: { personnel: 10, equipment: ["WMS"], partnerships: ["Last-mile carriers"] }
      }
    ],
    longTerm: [
      {
        id: 3,
        title: "Diversify Supplier Network",
        description: "Onboard secondary suppliers in different geographic regions to prevent single-point-of-failure disruptions.",
        priority: "Strategic",
        timeframe: "30-90 days",
        costEstimate: "$250K - $500K",
        impactReduction: "70-90% (future)",
        status: "planning",
        category: "longTerm",
        feasibility: "MEDIUM",
        dependencies: ["Quality assurance validation", "Contract negotiations"],
        riskFactors: ["Quality consistency", "Initial capital outlay"],
        successMetrics: ["Number of qualified suppliers", "Geographic risk distribution"],
        resourceRequirements: { personnel: 3, equipment: [], partnerships: ["New manufacturing partners"] }
      }
    ],
    riskMitigationMetrics: {
      currentRisk: 85,
      targetRisk: 30,
      costToImplement: "$400K - $725K",
      expectedROI: "3.5x",
      paybackPeriod: "6-8 months",
      riskReduction: "65%"
    },
    keyInsights: [
      "Due to current AI provider service limitations, this is a fallback algorithmic strategy.",
      "Reliance on a single primary transport node significantly elevates systemic risk.",
      "Immediate action to secure secondary freight capacity is required before market rates surge."
    ],
    marketIntelligence: [
      "Industry data shows logistics costs rising 15-20% during similar disruptions.",
      "Competitors are likely securing alternative capacity simultaneously."
    ],
    bestPractices: [
      "Implement real-time visibility tools across tier-1 and tier-2 suppliers.",
      "Maintain 15% buffer stock for high-margin SKUs."
    ],
    contingencyPlans: [
      "If secondary ports become congested, pivot to air freight for tier-1 priority customers only."
    ]
  };
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
