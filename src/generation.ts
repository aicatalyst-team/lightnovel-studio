import { gen } from './llm';
import { Project, Character, Chapter, WorldBuilding } from './types';
import { newCharacter, newChapter } from './storage';

// ─── 世界观 ──────────────────────────────────────────────────

export async function generateWorld(concept: string, genre: string, lang = 'zh'): Promise<WorldBuilding> {
  const isJa = lang === 'ja';
  const raw = await gen(isJa
    ? `あなたはライトノベルの世界観設計の専門家です。以下のコンセプトに基づいて世界観を設計してください。
ジャンル：${genre}、コンセプト：${concept}
以下のJSON形式で出力（他は出力しない）：
{"overview":"世界概要（200字）","era":"時代背景","geography":"主要な場所（3箇所以上）","organizations":"主要勢力（3つ以上）","magicSystem":"能力/魔法システム","constraints":"この世界に存在しない現代語","notes":"その他設定"}`
    : `你是专业轻小说世界观设计师。根据以下概念，设计完整的世界观。

类型：${genre}
概念：${concept}

请用以下JSON格式输出，内容具体详细：
{
  "overview": "世界整体概述（200字，包含核心设定）",
  "era": "时代背景和年代设定",
  "geography": "重要地点和地理环境（至少3个地点）",
  "organizations": "主要势力和组织（至少3个，含关系）",
  "magicSystem": "能力/魔法/科技体系（规则、等级、限制）",
  "constraints": "这个世界不存在的现代词汇和概念（写作时禁用）",
  "notes": "其他重要设定细节"
}

只输出JSON，不要其他内容：`
  );

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch { return { overview: cleaned.slice(0, 500), era: '', geography: '', organizations: '', magicSystem: '', constraints: '', notes: '' }; }
}

// ─── 角色群 ───────────────────────────────────────────────────

export async function generateCharacterCast(
  concept: string, world: WorldBuilding, count = 4, lang = 'zh'
): Promise<Partial<Character>[]> {
  const isJa = lang === 'ja';
  const raw = await gen(isJa
    ? `あなたはライトノベルのキャラクターデザインの専門家です。${count}人のキャラクターを設計してください。
コンセプト：${concept}、世界観：${world.overview}
JSON配列で出力（他は出力しない）。各キャラクター：name,role(主人公/ヒロイン/悪役/脇役),age,gender,height,build,affiliation,hairStyle,hairColor,eyeColor,eyeShape,skin,outfit,accessories,personalityKeywords,publicFace,privateFace,strengths,weaknesses,speech(一人称と口調),trauma,motivation,goal,arc,habits,likes,dislikes`
    : `你是专业轻小说角色设计师。根据以下信息，设计${count}个角色。

概念：${concept}
世界观：${world.overview}
时代：${world.era}

输出JSON数组，每个角色包含：name（角色名）、role（主角/女主/反派/配角）、age、gender、height、build、affiliation、hairStyle、hairColor、eyeColor、eyeShape、skin、outfit、accessories、personalityKeywords（5个关键词逗号分隔）、publicFace、privateFace、strengths、weaknesses、speech（口调和一人称）、trauma、motivation、goal、arc（角色弧线）、habits、likes、dislikes

只输出JSON数组：`);

  // 尝试多种方式提取 JSON 数组
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { /* 继续尝试 */ }
  // 从文本中提取第一个 [...] 数组
  const m = cleaned.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* 继续 */ } }
  throw new Error('AI 返回的角色数据格式不正确，请重试');
}

// ─── 章节大纲 ─────────────────────────────────────────────────

export async function generateChapterOutlines(
  concept: string, world: WorldBuilding, characters: Character[], numChapters: number, lang = 'zh'
): Promise<{ number: number; title: string; summary: string }[]> {
  const isJa = lang === 'ja';
  const charList = characters.map(c => `${c.name}（${c.role}）：${c.motivation}`).join('\n');

  const raw = await gen(isJa
    ? `あなたはライトノベルの編集者です。${numChapters}章の完全なストーリーアウトラインを作成してください。
コンセプト：${concept}、世界観：${world.overview}、主要キャラ：${charList}
要件：三幕構成、章間にフック、各章に感情的クライマックス。
JSON配列で出力：[{"number":1,"title":"章タイトル","summary":"100〜150字の詳細あらすじ（主要イベント、キャラ変化、感情的頂点、次章への伏線）"}]
JSON配列のみ出力：`
    : `你是专业轻小说编辑。规划${numChapters}章的完整故事大纲。

概念：${concept}
世界观：${world.overview}
主要角色：\n${charList}

要求：符合三幕结构，章节间有钩子连接，每章有情感高潮。

输出JSON数组：
[{"number":1,"title":"章节标题","summary":"本章详细概要（100-150字，含主要事件、人物状态变化、情感高潮、下章悬念）"}]

只输出JSON数组：`);

  const cleaned2 = raw.replace(/```json\n?|\n?```/g, '').trim();
  try { return JSON.parse(cleaned2); } catch { /* 继续 */ }
  const m2 = cleaned2.match(/\[[\s\S]*\]/);
  if (m2) { try { return JSON.parse(m2[0]); } catch { /* 继续 */ } }
  // 降级：返回空标题大纲（不抛错，让用户手动填写）
  return Array.from({ length: numChapters }, (_, i) => ({ number: i + 1, title: `第${i + 1}章`, summary: '' }));
}

// 清洗 AI 正文开头混入的标题行（markdown # 标题、"第N章/第N話 xxx" 标题），避免正文头部出现重复标题
function stripChapterHeading(text: string): string {
  let t = text.trim();
  // 反复剥离开头的标题样式行（最多剥 2 行，防止误删正文）
  for (let i = 0; i < 2; i++) {
    const before = t;
    t = t.replace(/^#{1,6}\s+[^\n]*\r?\n+/, '');                          // # / ## markdown 标题
    t = t.replace(/^第[一二三四五六七八九十百零0-9]+[章話话节][^\n]{0,40}\r?\n+/, ''); // 第N章/第N話 标题
    t = t.trim();
    if (t === before) break;
  }
  return t;
}

// ─── 单章正文 ─────────────────────────────────────────────────

export async function generateChapterContent(
  project: Project, chapter: Chapter, prevChapterContent?: string
): Promise<string> {
  const isJa = project.lang === 'ja';
  const charProfiles = project.characters.slice(0, 5).map(c =>
    `【${c.name}·${c.role}】性格：${c.personalityKeywords}｜口调：${c.speech}`
  ).join('\n');

  const prevContext = prevChapterContent
    ? (isJa ? `前章の末尾：\n${prevChapterContent.slice(-400)}` : `上章结尾：\n${prevChapterContent.slice(-400)}`)
    : (isJa ? '（第一章）' : '（本章为第一章）');

  if (isJa) {
    return stripChapterHeading(await gen(`あなたはプロのライトノベル作家です。以下の章の本文を書いてください。文字数は必ず4000字以上にしてください。4000字未満は不合格です。

【作品】${project.title}（${project.genre}）
【世界観】${project.world.overview}
【登場人物】\n${charProfiles}
【第${chapter.number}章「${chapter.title}」あらすじ】${chapter.summary}
${prevContext}

【必須ルール】
1. 文字数：必ず4000〜6000字（4000字未満は絶対に不可）
2. 文体：三人称過去形
3. 感覚：シーンごとに視覚以外の感覚を2つ以上含める
4. 比喩：シーンごとに独自の比喩を1〜2個
5. セリフ：「」、心理描写：（）
6. 段落：「　」インデント
7. 章末：次章への伏線・フックを必ず入れる

章タイトルなしで本文のみ出力：`, 16000));
  }

  return stripChapterHeading(await gen(`你是专业轻小说作家。你的任务是写出一章完整的轻小说正文，字数必须达到2000字以上，少于2000字视为不合格。

【作品】${project.title}（${project.genre}）
【世界观】${project.world.overview}
【禁用词汇】${project.world.constraints}
【角色】\n${charProfiles}
【第${chapter.number}章《${chapter.title}》概要】${chapter.summary}
${prevContext}

【硬性要求——不得违反】
1. 字数：必须写满2000字到3000字，绝对不能少于2000字
2. 文体：第三人称过去时
3. 感官：每个场景至少包含视觉以外的2种感官（听觉/触觉/嗅觉）
4. 比喻：每个场景至少1个新鲜比喻，禁用老套比喻
5. 对话：用「」，心理活动用（）
6. 缩进：每段首行用全角空格　缩进
7. 禁用：破折号——，用句号或逗号替代
8. 结尾：章末必须留下吸引读者继续阅读的悬念

直接输出正文，不要章节标题，不要任何说明：`, 12000));
}

// ─── 单字段填充 ───────────────────────────────────────────────

export async function fillWorldField(
  concept: string, genre: string, fieldLabel: string, existingContent: string
): Promise<string> {
  return await gen(`你是专业轻小说世界观设计师。
作品概念：${concept}
类型：${genre}
${existingContent ? `已有：${existingContent}\n` : ''}
请为「${fieldLabel}」写详细设定（200-400字，具体有画面感）：`);
}

// ─── 角色填充 ─────────────────────────────────────────────────

export async function fillCharacterFromConcept(
  concept: string, world: string, charConcept: string
): Promise<Partial<Character>> {
  const raw = await gen(`你是专业轻小说角色设计师。
作品概念：${concept}
世界观：${world}
角色概念：${charConcept}
输出单个角色JSON（含name/role/age/gender/height/build/affiliation/hairStyle/hairColor/eyeColor/eyeShape/skin/outfit/accessories/personalityKeywords/publicFace/privateFace/strengths/weaknesses/speech/trauma/motivation/goal/arc/habits/likes/dislikes），只输出JSON：`);
  try { return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()); }
  catch { return {}; }
}

// ─── 续写 ────────────────────────────────────────────────────

export async function continueWriting(project: Project, chapter: Chapter, instruction: string): Promise<string> {
  const chars = project.characters.slice(0, 4).map(c =>
    `${c.name}（${c.role}）：${c.personalityKeywords}，口调${c.speech}`
  ).join('；');

  return await gen(`你是专业轻小说作家。续写以下内容。

作品：${project.title}（${project.genre}）
世界观：${project.world.overview}
禁用词汇：${project.world.constraints}
角色：${chars}
当前章节：第${chapter.number}章《${chapter.title}》
概要：${chapter.summary}
已写末尾：${chapter.content.slice(-600) || '（尚未开始）'}
续写要求：${instruction || '自然续写，保持风格'}

400-600字，直接输出：`);
}

// ─── 对话生成 ─────────────────────────────────────────────────

export async function generateDialogue(project: Project, charName: string, situation: string): Promise<string> {
  const char = project.characters.find(c => c.name === charName);
  if (!char) throw new Error('角色不存在');
  return await gen(`你是专业轻小说作家。为角色生成台词和动作描写。

角色：${char.name}（${char.role}）
性格：${char.personalityKeywords}
表面：${char.publicFace}
内心：${char.privateFace}
口调：${char.speech}
情境：${situation}

200字台词+动作描写，直接输出：`);
}

// ─── 场景生成 ─────────────────────────────────────────────────

export async function generateScene(project: Project, sceneDesc: string): Promise<string> {
  const chars = project.characters.map(c => `${c.name}：${c.personalityKeywords}，口调${c.speech}`).join('；');
  return await gen(`你是专业轻小说作家。根据描述生成完整场景。

世界观：${project.world.overview}
禁用词汇：${project.world.constraints}
角色：${chars}
场景：${sceneDesc}

第三人称过去时，视觉+2种感官，1-2个比喻，约400字，直接输出：`);
}

// ─── 整合性审查 ───────────────────────────────────────────────

export async function checkConsistency(project: Project, text: string): Promise<string> {
  const chars = project.characters.map(c => `${c.name}：${c.personalityKeywords}，口调${c.speech}`).join('\n');
  return await gen(`你是专业轻小说编辑。审查以下文本。

世界观：${project.world.overview}
禁用词汇：${project.world.constraints}
角色：\n${chars}

待审文本：\n${text}

逐条输出：
1. **角色口调一致性**
2. **禁用词汇检查**
3. **逻辑矛盾**
4. **感官描写充分度**
5. **修改建议（2-3条）**`);
}

// ─── 读者体验 ─────────────────────────────────────────────────

export async function evaluateReaderExperience(project: Project, content: string): Promise<string> {
  return await gen(`你是资深轻小说读者，严格评价以下内容。

主题：${project.theme}
情感曲线设定：${project.emotionCurve}
内容：\n${content.slice(0, 2000)}

评价：
1. **读后感**：哪个场景最打动你？
2. **主题表现**
3. **情感曲线**
4. **代入感障碍**
5. **3条具体改进建议**`);
}
