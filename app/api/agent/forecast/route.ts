import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

import { supabaseServer } from '../../../../lib/supabase/server';
import { getAIKeyForModule, AI_MODELS } from '../../../../lib/ai-config';
import { logger } from '../../../../lib/monitoring';

// ─── Input validation ────────────────────────────────────────────────────────
const ForecastRequestSchema = z.object({
  supplyChainId: z.string().uuid(),
  nodeId: z.string().uuid().optional(),
  forecastHorizon: z.number().int().positive().default(30),
  includeWeather: z.boolean().default(true),
  includeMarketData: z.boolean().default(true),
  options: z.object({
    forceRefresh: z.boolean().default(false),
    detailLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  }).optional(),
});

// ─── Scenario schema (must match what forecast-scenarios/route.ts reads) ──────
const ScenarioSchema = z.object({
  scenarioName: z.string().describe('Short, specific name of the disruption scenario'),
  scenarioType: z.enum(['disruption', 'natural', 'economic', 'political', 'operational'])
    .describe('Category of disruption'),
  description: z.string().describe('2–3 sentence description of the scenario with a probability estimate and reasoning based on the supply chain structure'),
  disruptionSeverity: z.number().int().min(10).max(95).describe('Severity 0–100'),
  disruptionDuration: z.number().int().min(3).max(90).describe('Duration in days'),
  affectedNode: z.string().describe('Name of the primary node affected (use actual node names if available)'),
  monteCarloRuns: z.number().int().default(1000),
  distributionType: z.enum(['normal', 'log-normal', 'uniform']).default('normal'),
  cascadeEnabled: z.boolean().describe('True if this scenario likely cascades to downstream nodes'),
  failureThreshold: z.number().min(10).max(80).describe('% threshold at which the network is considered failed'),
  bufferPercent: z.number().min(5).max(30).describe('Recommended buffer inventory percentage'),
  alternateRouting: z.boolean().describe('True if alternate routes exist for this scenario'),
});

const ForecastOutputSchema = z.object({
  scenarios: z.array(ScenarioSchema).min(2).max(4)
    .describe('2–4 high-impact forecast scenarios specific to this supply chain'),
  overallRiskScore: z.number().min(0).max(100).describe('Overall risk score for the supply chain right now'),
  confidenceScore: z.number().min(0).max(1).describe('Confidence in this forecast (0–1)'),
  forecastSummary: z.string().describe('Executive summary of the forecast in 2–3 sentences'),
});

// ─── POST /api/agent/forecast ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const traceId = `forecast-${Date.now()}`;
  const startTime = Date.now();

  try {
    const requestBody = await request.json();
    const validationResult = ForecastRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const params = validationResult.data;
    logger.info({ message: 'Starting AI forecast generation', supplyChainId: params.supplyChainId, traceId });

    // ── 1. Verify supply chain exists ─────────────────────────────────────────
    const { data: supplyChain, error: supplyChainError } = await supabaseServer
      .from('supply_chains')
      .select('*')
      .eq('supply_chain_id', params.supplyChainId)
      .single();

    if (supplyChainError || !supplyChain) {
      return NextResponse.json(
        { error: 'Supply chain not found', details: supplyChainError?.message },
        { status: 404 }
      );
    }

    // ── 2. Fetch supply chain topology ────────────────────────────────────────
    const [{ data: nodes }, { data: edges }] = await Promise.all([
      supabaseServer.from('nodes').select('node_id, name, type, description, data').eq('supply_chain_id', params.supplyChainId),
      supabaseServer.from('edges').select('edge_id, from_node_id, to_node_id, data').eq('supply_chain_id', params.supplyChainId),
    ]);

    const nodeCount = nodes?.length ?? 0;
    const edgeCount = edges?.length ?? 0;
    const nodeNames = nodes?.map((n: any) => n.name || n.node_id).join(', ') || 'Unknown nodes';
    const nodeTypes = nodes?.map((n: any) => n.type).filter(Boolean) || [];
    const uniqueTypes = [...new Set(nodeTypes)].join(', ') || 'mixed';

    // ── 3. Check for recent intel from supply_chain_intel table ────────────────
    const { data: intel } = await supabaseServer
      .from('supply_chain_intel')
      .select('intelligence_data, news, risk_score')
      .eq('supply_chain_id', params.supplyChainId)
      .order('created_at', { ascending: false })
      .limit(3);

    const intelSummary = intel && intel.length > 0
      ? `Recent intelligence available for ${intel.length} node(s) with risk scores: ${intel.map((i: any) => i.risk_score).join(', ')}`
      : 'No recent intelligence available for this supply chain.';

    // ── 4. Generate structured scenarios via AI ───────────────────────────────
    const google = createGoogleGenerativeAI({ apiKey: getAIKeyForModule('agents') });

    const prompt = `You are a supply chain risk expert. Generate realistic, high-impact disruption forecast scenarios for the following supply chain:

SUPPLY CHAIN: ${supplyChain.name || 'Unknown'}
DESCRIPTION: ${supplyChain.description || 'No description provided'}
NETWORK TOPOLOGY:
- Total Nodes: ${nodeCount}
- Total Connections: ${edgeCount}
- Node Types: ${uniqueTypes}
- Node Names: ${nodeNames}
FORECAST HORIZON: ${params.forecastHorizon} days
RECENT INTELLIGENCE: ${intelSummary}

REQUIREMENTS:
- Generate 2–4 HIGH-IMPACT scenarios that are SPECIFIC to this supply chain's actual nodes and structure
- Use the actual node names (${nodeNames}) in affectedNode fields where possible
- Base severity and probability on real supply chain risk patterns
- Each scenario must be unique and cover different risk categories
- Include at least one scenario affecting a key hub node (high-connectivity node)
- Make descriptions specific and quantified (e.g., "78% probability", "40% reduction in capacity")
- Consider geographic, logistic, and operational risks for this network

Generate realistic, actionable forecast scenarios that a supply chain manager would find genuinely useful.`;

    let forecastOutput;
    try {
      const result = await generateObject({
        model: google(AI_MODELS.agents),
        schema: ForecastOutputSchema,
        prompt,
        maxTokens: 3000,
        temperature: 0.3,
      });
      forecastOutput = result.object;
    } catch (aiError: any) {
      logger.error({ message: 'AI generation failed', error: aiError.message, traceId });
      return NextResponse.json(
        { error: 'AI forecast generation failed', message: aiError.message, traceId },
        { status: 500 }
      );
    }

    // ── 5. Add start/end dates to each scenario ───────────────────────────────
    const now = Date.now();
    const scenariosWithDates = forecastOutput.scenarios.map((scenario, i) => ({
      ...scenario,
      startDate: new Date(now + (i + 1) * 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now + (i + 1) * 2 * 24 * 60 * 60 * 1000 + scenario.disruptionDuration * 24 * 60 * 60 * 1000).toISOString(),
      randomSeed: `forecast-ai-${params.supplyChainId.substring(0, 8)}-${i}`,
    }));

    // ── 6. Save to Supabase forecasts table ───────────────────────────────────
    const forecastRecord = {
      supply_chain_id: params.supplyChainId,
      node_id: params.nodeId || null,
      forecast_data: {
        summary: forecastOutput.forecastSummary,
        overallRiskScore: forecastOutput.overallRiskScore,
        generatedAt: new Date().toISOString(),
        nodeCount,
        edgeCount,
      } as any,
      scenario_json: scenariosWithDates as any,
      confidence_score: forecastOutput.confidenceScore,
      risk_score: forecastOutput.overallRiskScore,
      forecast_period: params.forecastHorizon,
      forecast_start_date: new Date().toISOString(),
      forecast_end_date: new Date(now + params.forecastHorizon * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: savedForecast, error: saveError } = await supabaseServer
      .from('forecasts')
      .insert(forecastRecord)
      .select('forecast_id')
      .single();

    if (saveError) {
      logger.error({ message: 'Failed to save forecast to Supabase', error: saveError.message, traceId });
      // Still return the generated scenarios even if save fails
    } else {
      logger.info({ message: 'Forecast saved to Supabase', forecastId: savedForecast?.forecast_id, traceId });
    }

    const processingTime = Date.now() - startTime;
    logger.info({ message: 'Forecast generation completed', processingTimeMs: processingTime, supplyChainId: params.supplyChainId, traceId });

    return NextResponse.json({
      success: true,
      forecast: {
        summary: forecastOutput.forecastSummary,
        overallRiskScore: forecastOutput.overallRiskScore,
        confidenceScore: forecastOutput.confidenceScore,
        scenarios: scenariosWithDates,
      },
      metadata: {
        processingTime,
        generated: new Date().toISOString(),
        supplyChainId: params.supplyChainId,
        nodeId: params.nodeId,
        forecastHorizon: params.forecastHorizon,
        savedToDatabase: !saveError,
        forecastId: savedForecast?.forecast_id,
      },
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logger.error({ message: 'Error generating forecast', error: error.message, processingTimeMs: processingTime, traceId });
    return NextResponse.json(
      { error: 'Error generating forecast', message: error.message, traceId },
      { status: 500 }
    );
  }
}

// ─── GET /api/agent/forecast — retrieve stored forecasts ─────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supply_chain_id = searchParams.get('supply_chain_id');
    const node_id = searchParams.get('node_id');

    if (!supply_chain_id) {
      return NextResponse.json({ error: 'Missing supply_chain_id parameter' }, { status: 400 });
    }

    let query = supabaseServer
      .from('forecasts')
      .select('*')
      .eq('supply_chain_id', supply_chain_id)
      .order('created_at', { ascending: false });

    if (node_id) query = query.eq('node_id', node_id);

    const { data: forecasts, error } = await query.limit(node_id ? 1 : 20);

    if (error) {
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    return NextResponse.json({
      message: forecasts && forecasts.length > 0
        ? 'Forecasts retrieved successfully'
        : 'No forecasts found for the specified criteria',
      count: forecasts?.length ?? 0,
      forecasts: forecasts ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve forecasts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
