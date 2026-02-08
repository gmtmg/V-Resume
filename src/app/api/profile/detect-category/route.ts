import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const JOB_CATEGORIES = [
  { code: 'engineering', name: 'エンジニア・技術職' },
  { code: 'sales', name: '営業' },
  { code: 'marketing', name: 'マーケティング・広報' },
  { code: 'design', name: 'デザイン・クリエイティブ' },
  { code: 'hr', name: '人事・総務' },
  { code: 'finance', name: '経理・財務' },
  { code: 'consulting', name: 'コンサルティング' },
  { code: 'management', name: '経営・管理職' },
  { code: 'service', name: 'サービス・接客' },
  { code: 'medical', name: '医療・福祉' },
  { code: 'education', name: '教育' },
  { code: 'legal', name: '法務' },
  { code: 'other', name: 'その他' },
];

interface DetectCategoryRequest {
  summaryText: string;
  desiredJobType?: string;
  experience?: string;
}

interface DetectCategoryResponse {
  success: boolean;
  category?: string;
  categoryName?: string;
  confidence?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<DetectCategoryResponse>> {
  try {
    const body: DetectCategoryRequest = await request.json();
    const { summaryText, desiredJobType, experience } = body;

    if (!summaryText && !desiredJobType && !experience) {
      return NextResponse.json({ success: false, error: '判定に必要な情報がありません' }, { status: 400 });
    }

    const categoryList = JOB_CATEGORIES.map((c) => `- ${c.code}: ${c.name}`).join('\n');

    const prompt = `以下の求職者情報から、最も適切な職種カテゴリを1つ選んでください。

## 求職者情報
${summaryText ? `面接要約: ${summaryText}` : ''}
${desiredJobType ? `希望職種: ${desiredJobType}` : ''}
${experience ? `経験: ${experience}` : ''}

## 職種カテゴリ一覧
${categoryList}

## 回答形式
以下のJSON形式で回答してください:
{
  "category": "カテゴリコード",
  "confidence": 0.0-1.0の信頼度
}

カテゴリコードは上記一覧のcode値のみ使用してください。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '求職者の職種カテゴリを判定するアシスタントです。指定されたJSON形式で回答してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ success: false, error: 'AI応答が空でした' }, { status: 500 });
    }

    const result = JSON.parse(content);
    const category = JOB_CATEGORIES.find((c) => c.code === result.category);

    if (!category) {
      return NextResponse.json({
        success: true,
        category: 'other',
        categoryName: 'その他',
        confidence: 0.5,
      });
    }

    return NextResponse.json({
      success: true,
      category: category.code,
      categoryName: category.name,
      confidence: result.confidence || 0.8,
    });
  } catch (error) {
    console.error('Detect category error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
