import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { CategorySummary } from './types';
import { SAVINGS_RATE_BY_CATEGORY } from './savings-config';

const bedrockClient = new BedrockRuntimeClient({});

const DEFAULT_MODEL_ID = 'us.amazon.nova-micro-v1:0';
const TOP_MERCHANTS_PER_CATEGORY = 3;
const MAX_TOKENS = 300;

const SYSTEM_PROMPT = `You are an Amazon Business Sales Representative reviewing a customer's procurement card spend report. Your goal is to identify spend that could be moved to Amazon Business and write a short, professional, non-pushy pitch that highlights the biggest opportunities and the concrete dollar savings already calculated for you. Do not invent numbers — use only the figures provided. Write 2-4 sentences as a single narrative paragraph (no bullet points, no headers). End with a brief, soft call to action.`;

interface CategoryOpportunity {
    category: string;
    totalSpend: number;
    estimatedSavings: number;
    topMerchants: string[];
}

function topMerchantsByCategory(summary: CategorySummary): string[] {
    const spendByMerchant = new Map<string, number>();
    for (const transaction of summary.transactions) {
        spendByMerchant.set(
            transaction.merchantName,
            (spendByMerchant.get(transaction.merchantName) ?? 0) + transaction.amountCents
        );
    }
    return [...spendByMerchant.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_MERCHANTS_PER_CATEGORY)
        .map(([merchantName]) => merchantName);
}

function buildOpportunities(summaries: CategorySummary[]): CategoryOpportunity[] {
    return summaries
        .filter((s) => s.totalSpend > 0 && SAVINGS_RATE_BY_CATEGORY[s.category] !== undefined)
        .map((s) => ({
            category: s.category,
            totalSpend: s.totalSpend,
            estimatedSavings: Number((s.totalSpend * SAVINGS_RATE_BY_CATEGORY[s.category]).toFixed(2)),
            topMerchants: topMerchantsByCategory(s),
        }));
}

function buildUserPrompt(opportunities: CategoryOpportunity[]): string {
    const lines = opportunities.map((o) => {
        const merchants = o.topMerchants.length > 0 ? ` Top merchants: ${o.topMerchants.join(', ')}.` : '';
        return `- ${o.category}: total spend $${o.totalSpend.toFixed(2)}, estimated savings on Amazon Business $${o.estimatedSavings.toFixed(2)}.${merchants}`;
    });

    return `Here is the customer's spend breakdown by category, with savings already calculated:\n${lines.join('\n')}\n\nWrite the pitch now.`;
}

export async function generateQuickAnalysis(summaries: CategorySummary[]): Promise<string | undefined> {
    const opportunities = buildOpportunities(summaries);
    if (opportunities.length === 0) {
        return undefined;
    }

    try {
        const response = await bedrockClient.send(
            new ConverseCommand({
                modelId: process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID,
                system: [{ text: SYSTEM_PROMPT }],
                messages: [{ role: 'user', content: [{ text: buildUserPrompt(opportunities) }] }],
                inferenceConfig: { maxTokens: MAX_TOKENS, temperature: 0.5 },
            })
        );

        const text = response.output?.message?.content?.find((block) => block.text !== undefined)?.text;
        return typeof text === 'string' && text.trim().length > 0 ? text.trim() : undefined;
    } catch (err) {
        console.error('Failed to generate quick analysis via Bedrock:', err);
        return undefined;
    }
}
