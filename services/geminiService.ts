

import { GoogleGenAI, Type } from "@google/genai";
import type { Answer, AnalysisResult, Question, NextStep, TraitScore } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TRAIT_NAMES: TraitScore['trait'][] = ['自己肯定感', '協調性', '倫理観', '承認欲求', '忍耐力', '感情調整力', 'ストレス耐性', '柔軟性'];

// --- 性格タイプのアーキタイプ定義 (動的生成) ---
interface PersonalityArchetype {
  name: string;
  description: string;
  scores: { [key in TraitScore['trait']]: number };
}

// 命名要素
const MOTIFS = ['太陽', '月光', '星々', '深海', '森林', '火山', '大地', '疾風', '鋼鉄', '水晶', '夜明け', '黄昏', '天空', '銀河', '吹雪', '砂漠'];
const ADJECTIVES = ['静かなる', '情熱の', '共感の', '自由な', '堅実な', '創造の', '陽気な', '冷静な', '献身的な', '知的な', '大胆な', '穏やかな', '革新の', '慈愛の', '不屈の', '孤高の'];
const ROLES = ['戦略家', 'チャレンジャー', 'ハーモナイザー', '冒険家', '守護者', 'アーティスト', '調停者', '探求者', '改革者', '思想家', 'メンター', 'サバイバー', '先導者', '賢者', '開拓者', '吟遊詩人'];

// 各要素の特性への影響値
const TRAIT_MODIFIERS: { [key: string]: { [key in TraitScore['trait']]?: number } } = {
  // Motifs
  '太陽': { '自己肯定感': 10, '協調性': 5, '承認欲求': 5, '感情調整力': -5 },
  '月光': { '自己肯定感': -5, '感情調整力': 10, '柔軟性': 5, '倫理観': 5 },
  '星々': { '柔軟性': 10, '協調性': 5, '自己肯定感': -5, '忍耐力': -5 },
  '深海': { '忍耐力': 10, '感情調整力': 10, 'ストレス耐性': 5, '協調性': -10 },
  '森林': { '協調性': 10, '倫理観': 10, '忍耐力': 5, '柔軟性': -5 },
  '火山': { '自己肯定感': 15, '忍耐力': 5, '感情調整力': -15, '協調性': -5 },
  '大地': { '倫理観': 10, '忍耐力': 10, 'ストレス耐性': 10, '柔軟性': -15 },
  '疾風': { '柔軟性': 15, '自己肯定感': 5, '忍耐力': -10, 'ストレス耐性': -5 },
  '鋼鉄': { '忍耐力': 15, 'ストレス耐性': 10, '倫理観': 5, '柔軟性': -10, '協調性': -5 },
  '水晶': { '倫理観': 15, '感情調整力': 10, '自己肯定感': 5, '承認欲求': -10 },
  '夜明け': { '自己肯定感': 5, '協調性': 5, '柔軟性': 5, '忍耐力': 5 },
  '黄昏': { '感情調整力': 5, '忍耐力': 5, '倫理観': 5, '承認欲求': -5 },
  '天空': { '自己肯定感': 10, '柔軟性': 10, '協調性': 5, '倫理観': -5 },
  '銀河': { '柔軟性': 15, '自己肯定感': 5, '倫理観': -10 },
  '吹雪': { 'ストレス耐性': 10, '忍耐力': 10, '感情調整力': 5, '協調性': -15 },
  '砂漠': { '忍耐力': 15, 'ストレス耐性': 15, '自己肯定感': 5, '協調性': -10 },

  // Adjectives
  '静かなる': { '感情調整力': 10, '忍耐力': 5, '承認欲求': -10 },
  '情熱の': { '自己肯定感': 10, '承認欲求': 5, '忍耐力': 5, '感情調整力': -10 },
  '共感の': { '協調性': 15, '倫理観': 5, '自己肯定感': -5 },
  '自由な': { '柔軟性': 15, '自己肯定感': 5, '倫理観': -10 },
  '堅実な': { '倫理観': 10, '忍耐力': 10, '柔軟性': -15 },
  '創造の': { '柔軟性': 10, '自己肯定感': 5, '承認欲求': 5, '協調性': -5 },
  '陽気な': { '協調性': 10, '承認欲求': 10, 'ストレス耐性': -5 },
  '冷静な': { '感情調整力': 15, 'ストレス耐性': 10, '協調性': -5 },
  '献身的な': { '協調性': 10, '倫理観': 10, '自己肯定感': -10 },
  '知的な': { '忍耐力': 5, '倫理観': 5, '感情調整力': 5, '承認欲求': -10 },
  '大胆な': { '自己肯定感': 15, 'ストレス耐性': 5, '倫理観': -10 },
  '穏やかな': { '協調性': 10, '感情調整力': 10, 'ストレス耐性': 5, '自己肯定感': -5 },
  '革新の': { '柔軟性': 15, '自己肯定感': 10, '倫理観': -5, '協調性': -5 },
  '慈愛の': { '協調性': 15, '倫理観': 10, '感情調整力': 5, '承認欲求': -10 },
  '不屈の': { '忍耐力': 15, 'ストレス耐性': 15, '自己肯定感': 5 },
  '孤高の': { '自己肯定感': 10, '忍耐力': 5, '協調性': -15, '承認欲求': -10 },

  // Roles
  '戦略家': { '忍耐力': 10, '感情調整力': 10, '柔軟性': 5, '協調性': -5 },
  'チャレンジャー': { '自己肯定感': 10, '忍耐力': 10, 'ストレス耐性': 5, '協調性': -10 },
  'ハーモナイザー': { '協調性': 15, '感情調整力': 5, '自己肯定感': -5, '承認欲求': 5 },
  '冒険家': { '柔軟性': 10, '自己肯定感': 5, 'ストレス耐性': 5, '忍耐力': -10 },
  '守護者': { '倫理観': 15, '忍耐力': 10, 'ストレス耐性': 5, '柔軟性': -10 },
  'アーティスト': { '柔軟性': 10, '自己肯定感': 5, '承認欲求': 10, '協調性': -5 },
  '調停者': { '協調性': 10, '倫理観': 5, '感情調整力': 10, '忍耐力': 5 },
  '探求者': { '柔軟性': 10, '忍耐力': 10, '自己肯定感': 5, '協調性': -10 },
  '改革者': { '自己肯定感': 10, '柔軟性': 10, 'ストレス耐性': 5, '倫理観': -5 },
  '思想家': { '忍耐力': 10, '感情調整力': 10, '倫理観': 5, '承認欲求': -10 },
  'メンター': { '協調性': 10, '倫理観': 10, '感情調整力': 5, '自己肯定感': -5 },
  'サバイバー': { 'ストレス耐性': 15, '忍耐力': 15, '自己肯定感': 5, '柔軟性': -5 },
  '先導者': { '自己肯定感': 15, '協調性': 5, '承認欲求': 5, '感情調整力': -5 },
  '賢者': { '倫理観': 15, '感情調整力': 10, '忍耐力': 5, '承認欲求': -15 },
  '開拓者': { '自己肯定感': 10, '忍耐力': 10, '柔軟性': 10, '協調性': -5 },
  '吟遊詩人': { '協調性': 10, '承認欲求': 10, '柔軟性': 5, '忍耐力': -5 }
};

function generateArchetypes(count: number): PersonalityArchetype[] {
    const archetypes: PersonalityArchetype[] = [];
    const usedNames = new Set<string>();
    const baseScore = 50;

    while (archetypes.length < count) {
        const motif = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
        const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const role = ROLES[Math.floor(Math.random() * ROLES.length)];
        
        const name = `${motif}の${adjective}${role}`;
        if (usedNames.has(name)) {
            continue;
        }
        usedNames.add(name);

        const scores: { [key in TraitScore['trait']]: number } = {} as any;
        
        for (const trait of TRAIT_NAMES) {
            let currentScore = baseScore;
            currentScore += (TRAIT_MODIFIERS[motif]?.[trait] || 0);
            currentScore += (TRAIT_MODIFIERS[adjective]?.[trait] || 0);
            currentScore += (TRAIT_MODIFIERS[role]?.[trait] || 0);
            
            // Add some randomness
            currentScore += Math.floor(Math.random() * 21) - 10; // -10 to +10

            scores[trait] = Math.max(1, Math.min(100, Math.round(currentScore)));
        }

        const sortedTraits = (Object.keys(scores) as TraitScore['trait'][]).sort((a, b) => scores[b] - scores[a]);
        const highestTrait = sortedTraits[0];
        const secondHighestTrait = sortedTraits[1];
        const thirdHighestTrait = sortedTraits[2];
        const lowestTrait = sortedTraits[sortedTraits.length - 1];

        const descriptionTemplates = [
            `あなたは「${name}」タイプです。\n「${motif}」が象徴する深いエネルギーと、「${adjective}」心がもたらす独自の視点、そして「${role}」としての役割が、あなたの個性の中核をなしています。\n\nあなたの最も際立った強みは「${highestTrait}」です。これは、困難な状況でも自分を見失わない心の支えとなります。次に強い「${secondHighestTrait}」は、他者との関係構築や目標達成において、あなたの行動を後押ししてくれるでしょう。さらに「${thirdHighestTrait}」も、あなたの隠れた才能として、さまざまな場面で発揮されます。\n\n一方で、あなたの持つ特性の中で「${lowestTrait}」は、比較的意識することが少ないかもしれません。これは弱点ではなく、あなたが他の強みに集中している証拠です。\n\n総合的に見て、あなたは思慮深く、独自の価値観を持って行動する力を持っています。あなたのユニークな組み合わせは、世界に新しい光をもたらす可能性を秘めているのです。`,
            `診断の結果、あなたは「${name}」というユニークな個性を持つタイプだとわかりました。\nこの名前は、あなたの内なる世界を象徴する「${motif}」、行動の指針となる「${adjective}」性質、そして社会の中で自然と担う「${role}」という3つの要素から成り立っています。\n\nあなたの最大の武器は、卓越した「${highestTrait}」です。これにより、多くの人がためらうような場面でも、自信を持って前に進むことができます。また、「${secondHighestTrait}」と「${thirdHighestTrait}」が、その力をさらに補強し、あなたの人間的な魅力を深めています。これらの特性が組み合わさることで、あなたは独自のバランスを保っているのです。\n\n逆に、あなたのエネルギーは「${lowestTrait}」にはあまり向いていないようです。これは決して欠点ではなく、むしろあなたが本当に大切にしていることにリソースを集中させている証と言えるでしょう。\n\nあなたは、静かな情熱と深い洞察力を兼ね備えた人物です。その個性を理解し、受け入れることで、あなたの可能性は無限に広がっていくはずです。`,
            `あなたの心の探求の旅は、「${name}」という素晴らしい結果にたどり着きました。\nこのタイプ名は、あなたの根底にある「${motif}」の力、物事に対する「${adjective}」姿勢、そしてあなたが世界と関わる際の「${role}」としての在り方を示しています。\n\n分析によると、あなたの最も輝いている特性は「${highestTrait}」です。これはあなたの羅針盤となり、人生の重要な決断を導いてくれます。それに続く「${secondHighestTrait}」と「${thirdHighestTrait}」は、あなたの行動に深みと柔軟性を与える重要な要素です。\n\nすべての人があらゆる面に秀でているわけではありません。あなたの場合、「${lowestTrait}」は、今はまだ開発の途上にある特性かもしれません。しかし、それはあなたが他の素晴らしい才能を磨き上げているからこそ。\n\n総じて、あなたは「${name}」として、複雑で魅力的な内面を持っています。あなたの強みを活かし、自分らしい人生を歩んでいくことで、周囲にも良い影響を与えていくことでしょう。`
        ];
        const description = descriptionTemplates[Math.floor(Math.random() * descriptionTemplates.length)];

        archetypes.push({ name, description, scores });
    }
    return archetypes;
}

// 200種類のアーキタイプを動的に生成
export const PERSONALITY_ARCHETYPES = generateArchetypes(200);


// --- Helper Functions ---

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (vecA.length !== vecB.length || vecA.length === 0) {
        return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

function findBestMatchingType(userScores: TraitScore[]): { personalityType: string; typeDescription: string } {
    const userVector = TRAIT_NAMES.map(traitName => {
        const scoreItem = userScores.find(s => s.trait === traitName);
        return scoreItem ? scoreItem.score : 0;
    });

    let bestMatch = { type: PERSONALITY_ARCHETYPES[0], similarity: -1 };

    for (const archetype of PERSONALITY_ARCHETYPES) {
        const archetypeVector = TRAIT_NAMES.map(traitName => archetype.scores[traitName] || 0);
        
        const similarity = cosineSimilarity(userVector, archetypeVector);
        
        if (similarity > bestMatch.similarity) {
            bestMatch = { type: archetype, similarity: similarity };
        }
    }
    
    return {
        personalityType: bestMatch.type.name,
        typeDescription: bestMatch.type.description
    };
}


export async function getNextStep(history: Answer[], scoreHistory: TraitScore[][], targetTrait: TraitScore['trait']): Promise<NextStep> {
  try {
    const conversationHistory = history.map(h => `質問: "${h.question.text}"\nあなたの回答: "${h.answerText}"`).join('\n');
    const scoreHistoryText = scoreHistory.length > 0
      ? scoreHistory.map((scores, index) => `分析${index + 1}回目:\n${scores.map(s => `${s.trait}: ${s.score}`).join(', ')}`).join('\n\n')
      : 'まだ分析結果はありません。';

    const prompt = `あなたはユーザーの良き相談相手となる、親しみやすい友人です。目的は、ユーザーの特定の性格特性である「${targetTrait}」について、それらの言葉を直接使わずに深く探ることです。

友達のように親しみやすいけれど、真剣に話を聞いてくれる、少し年上のお兄さん・お姉さんのような口調で質問してください。相手を尊重し、「（笑）」のような軽すぎる表現は使わず、誠実なトーンを維持してください。

【今回の質問の焦点】
**${targetTrait}**

【指示】
1.  **焦点の維持:** あなたが生成する質問は、**必ず「${targetTrait}」という特性を深く探るためのもの**でなければなりません。この特性に関連する、間接的で創造的な質問を投げかけてください。他の特性については、この質問生成の段階では意識する必要はありません。
2.  **会話履歴の活用:** これまでの会話の流れを考慮し、自然で文脈に沿った質問をしてください。同じような質問は避けてください。
3.  **スコアの包括的評価:** 質問生成は「${targetTrait}」に焦点を当てますが、スコア評価は会話全体を考慮して、**8つの特性すべて**（自己肯定感, 協調性, 倫理観, 承認欲求, 忍耐力, 感情調整力, ストレス耐性, 柔軟性）の現在のスコア（1-100）を推測し、\`traitScores\`として出力してください。
4.  **質問形式のルール:** 質問は**常に3〜5個のユニークで示唆に富む選択肢を持つ、選択式問題**にしてください。自由回答形式の質問は生成してはいけません。\`choices\`配列は絶対にnullや空配列にしてはいけません。

【これまでの会話履歴】
${conversationHistory || 'まだ会話はありません。'}

【これまでのスコア推移】
${scoreHistoryText}

【出力形式】
回答は、以下のスキーマに厳密に従ったJSONオブジェクトのみで返してください。`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            choices: { 
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            traitScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  trait: { type: Type.STRING, enum: TRAIT_NAMES },
                  score: { type: Type.INTEGER }
                },
                required: ['trait', 'score']
              }
            }
          },
          required: ['question', 'choices', 'traitScores'],
        },
      }
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result as NextStep;

  } catch (error) {
    console.error("Error getting next step:", error);
    throw new Error("次の質問の生成に失敗しました。しばらくしてからもう一度お試しください。");
  }
}

export async function analyzeAnswers(answers: Answer[], skippedQuestions: Question[]): Promise<AnalysisResult> {
  try {
    const qaPairs = answers.map(a => `質問: ${a.question.text}\n回答: ${a.answerText}`).join('\n\n');
    const skippedQuestionsText = skippedQuestions.map(q => q.text).join('\n');

    const prompt = `あなたは非常に洞察力に優れた心理アナリストです。ユーザーの回答を分析し、多角的な性格評価を提供してください。結果は具体的で、ユーザーが自己理解を深められるような、思いやりのある言葉で記述してください。

**分析のステップ:**

1.  **8つの特性評価:**
    ユーザーの回答に基づき、以下の8つの特性をそれぞれ1から100のスケールで採点してください。
    - 自己肯定感 (Self-Esteem)
    - 協調性 (Cooperativeness)
    - 倫理観 (Sense of Ethics)
    - 承認欲求 (Need for Approval)
    - 忍耐力 (Perseverance)
    - 感情調整力 (Emotional Regulation)
    - ストレス耐性 (Stress Tolerance)
    - 柔軟性 (Flexibility)

2.  **詳細なテキスト分析:**
    以下の3つの項目について、ユーザーの人物像が目に浮かぶような、**非常に詳細で具体的な**分析を生成してください。**各項目は最低でも300文字以上**で、複数の段落に分けて構成してください。表面的な分析ではなく、回答の背後にある心理や価値観を深く洞察してください。

    - **yourRoleInFamily:**
        1.  **家庭環境と関係性の推測:** 回答から、ユーザーが育ったであろう家庭環境（例：ルールに厳しい、自由奔放、過保護、放任、期待が大きいなど）や、兄弟構成、親との関係性（父との関係、母との関係）まで踏み込んで具体的に推測します。
        2.  **役割と感情の深掘り:** その環境の中で、ユーザーがどのような役割（例：優等生、聞き役、ムードメーカー、問題児、孤独など）を担い、その中でどのようなコミュニケーションパターンや愛情表現を身につけたかを分析します。その役割を演じる中で感じていた感情（喜び、プレッシャー、安らぎ、息苦しさなど）も深く掘り下げてください。
        3.  **現在への影響:** その家庭環境で形成された性格や役割が、現在の友人関係、恋愛観、そして職場や学校での人間関係の構築にどのように影響を与えているか、具体的な考察を加えてください。

    - **learningStyle:**
        1.  **最適な学習プロセスの特定:** ユーザーに最も適した学習スタイル（例：視覚優位、聴覚優位、体験型、論理型、社交型など）に加え、情報処理の傾向（全体像から把握するタイプか、細部から積み上げるタイプか）も特定します。
        2.  **具体的な学習戦略の提案:** そのスタイルに基づき、「どのような教材が合うか」「どのような学習環境が理想か」「最適な休憩の取り方」「集中力が続く時間」など、明日から実践できる具体的な学習戦略を複数提案してください。
        3.  **強みと弱みの分析:** ユーザーの学習における強みと、逆に苦手な学習状況（例：プレッシャー下、騒がしい場所、抽象的な概念の理解など）を分析し、その弱みを克服するための具体的なアドバイスを、ユーザーの複数の回答を引用・解釈しながら説得力を持って提示してください。

    - **motivationSource:**
        1.  **モチベーションの源泉とバランスの分析:** ユーザーが何によって行動のモチベーションを得るタイプか（例：内発的動機（成長、探求心）、外発的動機（承認、報酬）、達成動機、社会貢献など）を深く分析します。長期的な目標と短期的な目標、どちらに動機づけられやすいか、また外的報酬と内的報酬のどちらがより強く響くか、そのバランスについても言及してください。
        2.  **エネルギーの源:** どのような状況、言葉、環境に置かれると、ユーザーのエネルギーが最も高まるかを具体的に描写してください。
        3.  **キャリアと人生への応用:** この動機づけの源泉を、今後のキャリア選択や趣味の選び方、人生の目標設定にどう活かせるか、具体的な例を挙げてアドバイスを提供してください。逆に、どのような要因がモチベーションを低下させる可能性があるかについても言及し、セルフケアのヒントを提供してください。

3.  **各特性ごとのフィードバック:**
    各グラフ項目について、以下の4つの項目を日本語で提供してください。
    - **trait:** （特性名）
    - **score:** 1から100の数値スコア。
    - **reason:** なぜそのスコアになったのか、**複数の回答を総合的に解釈し、説得力のある根拠として**簡潔に説明してください。単一の回答の引用だけでなく、全体的な傾向を述べてください。
    - **explanation:** そのスコアがユーザーの性格について何を示唆しているかを説明する、協力的で建設的な段落。
    - **advice:** その特性をさらに伸ばしたり、バランスを取るための、具体的で実行可能なアドバイス。

**ユーザーの情報:**

【質問と回答のペア】
${qaPairs}

【スキップした質問】
${skippedQuestionsText || 'なし'}
(スキップした質問がある場合、そのトピックを避ける傾向も分析に含めてください)

**出力形式:**
分析結果は、以下のスキーマに厳密に従ったJSONオブジェクトのみで返してください。`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Use a more powerful model for complex analysis
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            yourRoleInFamily: { type: Type.STRING },
            learningStyle: { type: Type.STRING },
            motivationSource: { type: Type.STRING },
            analysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  trait: { type: Type.STRING, enum: TRAIT_NAMES },
                  score: { type: Type.INTEGER },
                  reason: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  advice: { type: Type.STRING }
                },
                required: ['trait', 'score', 'reason', 'explanation', 'advice']
              }
            }
          },
          required: ['yourRoleInFamily', 'learningStyle', 'motivationSource', 'analysis']
        }
      }
    });

    const jsonString = response.text.trim();
    const apiResult = JSON.parse(jsonString) as Omit<AnalysisResult, 'personalityType' | 'typeDescription'>;

    if (!apiResult || !Array.isArray(apiResult.analysis) || apiResult.analysis.length === 0) {
        throw new Error("APIから有効な分析結果が返されませんでした。");
    }

    // AIの分析結果に基づいて、最も一致する性格タイプを決定する
    const { personalityType, typeDescription } = findBestMatchingType(apiResult.analysis);
    
    // AIの分析結果と、計算で求めた性格タイプをマージする
    const finalResult: AnalysisResult = {
        ...apiResult,
        personalityType,
        typeDescription,
    };
    
    return finalResult;

  } catch (error) {
    console.error("Error analyzing answers:", error);
    throw new Error("回答の分析に失敗しました。しばらくしてからもう一度お試しください。");
  }
}


export async function evaluateAnswer(question: string, answer: string): Promise<{ isValid: boolean; shouldSkip: boolean; needsReason: boolean; feedback: string }> {
  try {
    const prompt = `あなたはチャットボットの応答評価システムです。ユーザーの回答が、与えられた質問に対して適切かどうか、また、深掘りやスキップの意図があるかを判断してください。

以下の4つの項目を評価してください：
1.  \`isValid\`: 回答として成立しているか？（無関係な内容や無意味な文字列はfalse）
2.  \`shouldSkip\`: 回答に「わからない」「難しい」「パス」「答えたくない」といった、質問をスキップしたい意図が含まれているか？
3.  \`needsReason\`: 回答は有効だが、「うん」「Aかな」のように短すぎて、理由を尋ねるべきか？ (\`shouldSkip\`がtrueの場合は、こちらはfalseにしてください)
4.  \`feedback\`: 上記の判断に基づき、ユーザーに返すフィードバックメッセージを生成してください。親しみやすく、でも少し丁寧な、友達のような口調（例：「なるほど！もう少し詳しく聞いてもいい？」）でお願いします。\`isValid\`がtrueで\`shouldSkip\`と\`needsReason\`がfalseの場合は、feedbackは空文字列でOKです。

質問: "${question}"
回答: "${answer}"

評価結果を以下のJSON形式で返してください:
{
  "isValid": boolean,
  "shouldSkip": boolean,
  "needsReason": boolean,
  "feedback": "フィードバックメッセージ"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            shouldSkip: { type: Type.BOOLEAN },
            needsReason: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
          },
          required: ['isValid', 'shouldSkip', 'needsReason', 'feedback'],
        },
      },
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    
    if (result && typeof result.isValid === 'boolean' && typeof result.needsReason === 'boolean') {
      return result;
    } else {
      // 解析失敗時は、ユーザーをブロックしないように有効とみなす
      return { isValid: true, shouldSkip: false, needsReason: false, feedback: "" };
    }
  } catch (error) {
    console.error("Error evaluating answer:", error);
    // APIエラー時も、ユーザーをブロックしないように有効とみなす
    return { isValid: true, shouldSkip: false, needsReason: false, feedback: "" };
  }
}