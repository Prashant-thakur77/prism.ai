import '@/lib/zod-patch';
import { tavily } from '@tavily/core';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { LlmAgent, FunctionTool, Gemini, InMemoryRunner, stringifyContent } from '@google/adk';
import { z } from 'zod';
import { getAIKeyForModule, AI_MODELS } from '@/lib/ai-config';
import { withTrace } from '../../../../lib/adk/core/trace';

const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY
});

// In-memory rate-limit guard — avoid hammering Tavily on every request
let lastFetchTime = 0;
const FETCH_COOLDOWN = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const now = Date.now();

    // Only call Tavily if cooldown has expired
    if (now - lastFetchTime > FETCH_COOLDOWN) {
      console.log('🔍 Fetching fresh news via NewsSentinelAgent...');

      const tavilyTool = new FunctionTool({
        name: 'search_tavily_news',
        description: 'Fetch the latest news articles about supply chain disruptions',
        parameters: z.object({ query: z.string() }),
        execute: async (args) => {
          return await tavilyClient.search(args.query, { topic: 'news', days: 2, maxResults: 10 });
        }
      });

      const dbTool = new FunctionTool({
        name: 'save_news_to_db',
        description: 'Save relevant news articles to the notifications database',
        parameters: z.object({
          articles: z.array(z.object({
            title: z.string(),
            content: z.string(),
            url: z.string(),
            publishedDate: z.string()
          }))
        }),
        execute: async (args) => {
          const { data: existingNews } = await supabaseServer
            .from('notifications')
            .select('citations')
            .eq('user_id', userId)
            .eq('notification_type', 'live_news_alert');

          const existingUrls = new Set((existingNews || []).map((n: any) => n.citations?.sources?.[0]?.url).filter(Boolean));
          const newArticles = args.articles.filter((r) => !existingUrls.has(r.url));

          if (newArticles.length > 0) {
            const inserts = newArticles.map((result) => ({
              user_id: userId,
              title: result.title,
              message: result.content ? result.content.substring(0, 500) + (result.content.length > 500 ? '...' : '') : 'No content available.',
              notification_type: 'live_news_alert',
              severity: 'MEDIUM' as const,
              read_status: false,
              created_at: result.publishedDate || new Date().toISOString(),
              citations: {
                category: 'Live News',
                sources: [{ title: result.title, url: result.url, publishedAt: result.publishedDate || new Date().toISOString(), credibility: 0.85 }],
                affectedEntities: ['Global Supply Chain'],
              },
            }));
            await supabaseServer.from('notifications').insert(inserts);
            return { saved: inserts.length, status: 'success' };
          }
          return { saved: 0, status: 'no_new_articles' };
        }
      });

      const traceId = `news-sentinel-${Date.now()}`;
      await withTrace(traceId, 'NewsSentinelAgent', async () => {
        const agent = new LlmAgent({
          name: 'news_sentinel',
          description: 'Background loop agent monitoring supply chain news',
          instruction: 'Search for "latest supply chain disruption logistics trade news". Take the results and save them to the DB using your tool.',
          model: new Gemini({ model: AI_MODELS.agents, apiKey: getAIKeyForModule('agents') }),
          tools: [tavilyTool, dbTool]
        });

        const runner = new InMemoryRunner({ appName: 'news', agent });
        let finalContent = '';
        for await (const event of runner.runEphemeral({
          userId: userId,
          newMessage: { role: 'user', parts: [{ text: 'Run your scheduled news check now.' }] }
        })) {
          const text = stringifyContent(event);
          if (text) finalContent += text;
        }
        return { success: true, data: finalContent };
      });

      lastFetchTime = now;
    } else {
      console.log('📡 Tavily cooldown active — serving news from Supabase only.');
    }

    // Always return the 5 most recent live_news_alert notifications from DB
    const { data: latestNews, error: fetchError } = await supabaseServer
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('notification_type', 'live_news_alert')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('⚠️ Failed to fetch news from Supabase:', fetchError.message);
      return NextResponse.json({ notifications: [] });
    }

    return NextResponse.json({ notifications: latestNews || [] });

  } catch (error: any) {
    console.error('⚠️ News polling failure:', error?.message);
    return NextResponse.json({
      notifications: [],
      error: error?.message || 'Internal error',
      fallback: true
    });
  }
}
