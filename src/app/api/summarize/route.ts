import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function POST(request: NextRequest) {
  try {
    const { transcripts } = await request.json();

    if (!transcripts || !Array.isArray(transcripts)) {
      return NextResponse.json(
        { error: 'Invalid request: transcripts array required' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 503 }
      );
    }

    // Combine all transcripts with question context
    const combinedText = transcripts
      .map(
        (t: { question: string; answer: string }, i: number) =>
          `【質問${i + 1}: ${t.question}】\n${t.answer}`
      )
      .join('\n\n');

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは採用担当者向けに候補者の面接内容を要約・評価するアシスタントです。

【重要なルール】
- 候補者の氏名は絶対に要約に含めないでください
- 「候補者」「この方」などの表現を使用してください
- 名前が発話内容に含まれていても、要約では省略してください

以下の点に注意して、300〜400字程度で簡潔にまとめてください：
- 候補者の強みや特徴
- 経験やスキルのハイライト
- 希望する働き方や条件
- 全体的な印象と評価ポイント

敬語で、客観的な表現を心がけてください。`,
        },
        {
          role: 'user',
          content: `以下は候補者のアバター面接での各質問に対する回答内容です。氏名は含めずに要約・評価してください。\n\n${combinedText}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
