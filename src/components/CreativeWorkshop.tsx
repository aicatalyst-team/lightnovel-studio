import React, { useState, useEffect, useRef } from 'react';
import { Project, Character, Chapter } from '../types';
import { newCharacter, newChapter } from '../storage';
import {
  generateWorld, generateCharacterCast, generateChapterOutlines,
  generateChapterContent, fillCharacterFromConcept
} from '../generation';
import { gen } from '../llm';

interface Props {
  project: Project;
  onChange: (p: Project) => void;
  onNavigate: (view: string) => void;
}

type Step = 'concept' | 'world' | 'characters' | 'plot' | 'writing';

const STEPS: { key: Step; label: string; desc: string }[] = [
  { key: 'concept',    label: '创意概念',  desc: '一句话定义你的故事' },
  { key: 'world',      label: '世界观',    desc: 'AI 构建完整世界设定' },
  { key: 'characters', label: '角色',      desc: 'AI 设计主要人物' },
  { key: 'plot',       label: '章节大纲',  desc: 'AI 规划故事结构' },
  { key: 'writing',    label: '正文生成',  desc: 'AI 逐章写出内容' },
];

// 自动撑高文本框
function AutoArea({ value, onChange, placeholder, minH = 100 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; minH?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = Math.max(minH, ref.current.scrollHeight) + 'px';
    }
  }, [value]);
  return (
    <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
      className="field-input scrollbar-thin"
      style={{ resize: 'none', overflow: 'hidden', minHeight: minH, lineHeight: 1.8, fontSize: 14 }} />
  );
}

// AI 操作按钮
function AIButton({ onClick, loading, label, disabled }: {
  onClick: () => void; loading: boolean; label: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="btn-primary"
      style={{ gap: 8, fontSize: 14, padding: '10px 22px' }}>
      {loading ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      )}
      {loading ? '生成中…' : label}
    </button>
  );
}

// 重新生成按钮
function RegenButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="btn-ghost" style={{ fontSize: 13, gap: 6 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={loading ? { animation: 'spin 1s linear infinite' } : {}}>
        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
      </svg>
      重新生成
    </button>
  );
}

// 下一步按钮
function NextButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="btn-ghost" style={{ fontSize: 13, gap: 6 }}>
      {label}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

export default function CreativeWorkshop({ project, onChange, onNavigate }: Props) {
  const [step, setStep] = useState<Step>('concept');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');

  const [concept, setConcept] = useState(project.summary || '');
  const [numChapters, setNumChapters] = useState(project.chapters.length || 10);

  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [generatedChapters, setGeneratedChapters] = useState<Set<number>>(
    new Set(project.chapters.filter(c => c.content.length > 100).map(c => c.number))
  );

  const run = async (msg: string, fn: () => Promise<void>) => {
    setLoading(true); setError(''); setLoadingMsg(msg);
    try { await fn(); }
    catch (e: any) { setError(e.message || '生成失败，请重试'); }
    finally { setLoading(false); setLoadingMsg(''); }
  };

  // ── Step 1: 概念 ──

  const saveConcept = () => {
    if (!concept.trim()) { setError('请填写作品概念'); return; }
    onChange({ ...project, summary: concept });
    setStep('world');
  };

  const suggestConcept = () => run('AI 正在帮你想故事概念…', async () => {
    const genre = project.genre || '轻小说';
    const result = await gen(`你是专业${genre}编辑。请给出3个独特有趣的${genre}故事概念，每个概念用一句话描述核心冲突和吸引力。
格式：
1. 【概念名】：描述……
2. 【概念名】：描述……
3. 【概念名】：描述……
每个概念要有新意，避免常见套路。`);
    setConcept(result);
  });

  const genAllFromConcept = () => run('AI 正在一键生成所有设定…', async () => {
    const p = { ...project, summary: concept };
    setLoadingMsg('构建世界观…');
    const world = await generateWorld(concept, project.genre, project.lang ?? 'zh');
    setLoadingMsg('设计角色群…');
    let characters: Character[] = [];
    try {
      const casts = await generateCharacterCast(concept, world, 4, project.lang ?? 'zh');
      characters = casts.map(c => ({ ...newCharacter(), ...c, name: c.name || '未命名角色' }));
    } catch {
      // 角色生成失败：重试一次
      setLoadingMsg('角色生成重试中…');
      try {
        const casts2 = await generateCharacterCast(concept, world, 4, project.lang ?? 'zh');
        characters = casts2.map(c => ({ ...newCharacter(), ...c, name: c.name || '未命名角色' }));
      } catch {
        setError('角色生成失败（已跳过），请到「角色」步骤手动补充');
      }
    }
    setLoadingMsg(`规划 ${numChapters} 章大纲…`);
    const outlines = await generateChapterOutlines(concept, world, characters, numChapters, project.lang ?? 'zh');
    const chapters: Chapter[] = outlines.map(o => ({ ...newChapter(o.number), title: o.title, summary: o.summary }));
    onChange({ ...p, world, characters, chapters });
    setStep('writing');
  });

  // ── Step 2: 世界观 ──

  const genWorld = () => run('AI 正在构建世界观…', async () => {
    const world = await generateWorld(concept || project.summary, project.genre, project.lang ?? 'zh');
    onChange({ ...project, world, summary: concept || project.summary });
    setStep('world');
  });

  // ── Step 3: 角色 ──

  const genCharacters = () => run('AI 正在设计角色群…', async () => {
    const casts = await generateCharacterCast(concept || project.summary, project.world, 4, project.lang ?? 'zh');
    const characters: Character[] = casts.map(c => ({ ...newCharacter(), ...c, name: c.name || '未命名角色' }));
    onChange({ ...project, characters });
    setStep('characters');
  });

  const genOneCharacter = async (idx: number) => {
    const c = project.characters[idx];
    if (!c) return;
    setLoading(true); setError('');
    try {
      const result = await fillCharacterFromConcept(project.summary, project.world.overview, `${c.role}：${c.name}`);
      const chars = project.characters.map((ch, i) => i === idx ? { ...ch, ...result } : ch);
      onChange({ ...project, characters: chars });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Step 4: 大纲 ──

  const genPlot = () => run(`AI 正在规划 ${numChapters} 章大纲…`, async () => {
    const outlines = await generateChapterOutlines(concept || project.summary, project.world, project.characters, numChapters, project.lang ?? 'zh');
    const chapters: Chapter[] = outlines.map(o => ({ ...newChapter(o.number), title: o.title, summary: o.summary }));
    onChange({ ...project, chapters });
    setStep('plot');
  });

  // ── Step 5: 正文 ──

  // 单章生成：基于传入的 base 副本，返回更新后的 project，避免闭包里的旧 project 覆盖已生成内容
  const genChapterOn = async (base: Project, ch: Chapter): Promise<Project> => {
    setGeneratingChapter(ch.number); setError('');
    try {
      const prev = base.chapters.find(c => c.number === ch.number - 1);
      const content = await generateChapterContent(base, ch, prev?.content);
      const wordCount = content.replace(/\s/g, '').length;
      const chapters = base.chapters.map(c => c.id === ch.id ? { ...c, content, wordCount } : c);
      const updated = { ...base, chapters };
      onChange(updated);
      setGeneratedChapters(prevSet => new Set([...prevSet, ch.number]));
      return updated;
    } catch (e: any) { setError(e.message); return base; }
    finally { setGeneratingChapter(null); }
  };

  const genChapter = (ch: Chapter) => genChapterOn(project, ch);

  const genAllChapters = async () => {
    // 用累积副本逐章生成：每章都基于上一章已写入的最新内容，既不覆盖也能保持连贯
    let working = project;
    for (const ch of working.chapters.filter(c => !generatedChapters.has(c.number))) {
      working = await genChapterOn(working, ch);
    }
  };

  const stepIndex = STEPS.findIndex(s => s.key === step);
  const totalWords = project.chapters.reduce((s, c) => s + c.wordCount, 0);
  const hasWorld = !!project.world.overview;
  const hasChars = project.characters.length > 0;
  const hasPlot  = project.chapters.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* 顶部步骤进度 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ede9e3', padding: '0 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 52 }}>
          {STEPS.map((s, i) => {
            const done    = i < stepIndex;
            const current = s.key === step;
            return (
              <React.Fragment key={s.key}>
                <button onClick={() => setStep(s.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px',
                    border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent',
                    color: done ? '#22c55e' : current ? '#e11d5a' : '#a8a29e',
                  }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                    background: done ? '#dcfce7' : current ? '#e11d5a' : '#f5f5f4',
                    color: done ? '#16a34a' : current ? '#fff' : '#a8a29e',
                  }}>
                    {done
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      : i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: current ? 600 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: i < stepIndex ? '#86efac' : '#ede9e3', margin: '0 4px', minWidth: 16 }} />
                )}
              </React.Fragment>
            );
          })}
          {project.chapters.length > 0 && (
            <span style={{ marginLeft: 16, fontSize: 12, color: '#a8a29e', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {generatedChapters.size}/{project.chapters.length} 章 · {totalWords.toLocaleString()} 字
            </span>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div style={{ margin: '16px 28px 0', padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* 主内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px' }} className="scrollbar-thin">

        {/* ── Step 1: 概念 ── */}
        {step === 'concept' && (
          <div style={{ maxWidth: 640 }} className="animate-fade-in">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', marginBottom: 6 }}>描述你的创意</h2>
            <p style={{ fontSize: 14, color: '#78716c', marginBottom: 24, lineHeight: 1.7 }}>
              一句话概念，AI 将帮你填充世界观、角色、大纲，并逐章生成正文。
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#78716c', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>作品概念</label>
              <AutoArea value={concept} onChange={setConcept} minH={88}
                placeholder="例：一个被认定为废材的少年，偶然觉醒了被封印千年的禁忌之力，卷入了魔法贵族世界的权力斗争……" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#78716c', marginBottom: 6 }}>类型</label>
                <select value={project.genre} onChange={e => onChange({ ...project, genre: e.target.value })} className="field-input" style={{ appearance: 'none' }}>
                  <optgroup label="中文类型">
                    {['轻小说', '玄幻', '言情', '都市', '悬疑', '科幻', '历史', '武侠', '奇幻'].map(g => <option key={g}>{g}</option>)}
                  </optgroup>
                  <optgroup label="日式类型 (Light Novel)">
                    {['異世界転生', '魔法学園', '剣と魔法', 'ラブコメ', 'ハーレム', '能力バトル', 'ダンジョン攻略', 'VRゲーム', '悪役令嬢', 'チート無双', '日常系', '転生悪魔', 'ざまぁ系'].map(g => <option key={g}>{g}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#78716c', marginBottom: 6 }}>写作语言</label>
                <select value={project.lang ?? 'zh'} onChange={e => onChange({ ...project, lang: e.target.value as import('../types').Lang })} className="field-input" style={{ appearance: 'none' }}>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#78716c', marginBottom: 6 }}>目标章节数</label>
                <input type="number" value={numChapters} onChange={e => setNumChapters(Number(e.target.value))} min={3} max={50} className="field-input" />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#78716c', marginBottom: 6 }}>主题（可选）</label>
              <input type="text" value={project.theme} onChange={e => onChange({ ...project, theme: e.target.value })}
                placeholder="成长、救赎、孤独与连接……" className="field-input" />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <AIButton onClick={genAllFromConcept} loading={loading} label="AI 一键生成全部（世界观+角色+大纲）" />
              <button onClick={suggestConcept} disabled={loading} className="btn-ghost">
                AI 帮我想概念
              </button>
              <button onClick={saveConcept} className="btn-ghost">手动逐步填写</button>
            </div>
            {loading && <p style={{ marginTop: 12, fontSize: 13, color: '#e11d5a', animation: 'pulse 1s ease-in-out infinite' }}>{loadingMsg}</p>}
          </div>
        )}

        {/* ── Step 2: 世界观 ── */}
        {step === 'world' && (
          <div style={{ maxWidth: 680 }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', marginBottom: 4 }}>世界观设定</h2>
                <p style={{ fontSize: 13, color: '#a8a29e' }}>{hasWorld ? '已生成，可直接修改；或重新生成换一版' : '填写作品概念后，AI 可生成完整世界观'}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {hasWorld
                  ? <RegenButton onClick={genWorld} loading={loading} />
                  : <AIButton onClick={genWorld} loading={loading} label="AI 生成世界观" />
                }
              </div>
            </div>

            {loading && <p style={{ fontSize: 13, color: '#e11d5a', marginBottom: 16 }}>{loadingMsg || 'AI 正在构建世界观…'}</p>}

            {[
              { key: 'overview',      label: '世界概况' },
              { key: 'era',           label: '时代背景' },
              { key: 'geography',     label: '地理环境' },
              { key: 'organizations', label: '势力组织' },
              { key: 'magicSystem',   label: '能力体系' },
              { key: 'constraints',   label: '禁用词汇（写作时不得使用）' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#78716c', marginBottom: 6 }}>{f.label}</label>
                <AutoArea
                  value={project.world[f.key as keyof typeof project.world]}
                  onChange={v => onChange({ ...project, world: { ...project.world, [f.key]: v } })}
                  minH={80}
                />
              </div>
            ))}

            {!hasWorld && (
              <div style={{ padding: '32px', border: '1px dashed #e7e5e4', borderRadius: 16, textAlign: 'center', color: '#c4bfbb', marginTop: 8 }}>
                <p style={{ fontSize: 13 }}>点击上方「AI 生成世界观」开始</p>
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              {!hasWorld
                ? <AIButton onClick={genWorld} loading={loading} label="AI 生成世界观" />
                : <AIButton onClick={genCharacters} loading={loading} label="完成，AI 生成角色" />
              }
              <button onClick={() => onNavigate('world')} className="btn-ghost" style={{ fontSize: 13 }}>前往详细编辑</button>
            </div>
          </div>
        )}

        {/* ── Step 3: 角色 ── */}
        {step === 'characters' && (
          <div style={{ maxWidth: 720 }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', marginBottom: 4 }}>角色设定</h2>
                <p style={{ fontSize: 13, color: '#a8a29e' }}>{hasChars ? `已生成 ${project.characters.length} 个角色，可修改或重新生成` : 'AI 根据世界观生成主要角色群'}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {hasChars
                  ? <RegenButton onClick={genCharacters} loading={loading} />
                  : <AIButton onClick={genCharacters} loading={loading} label="AI 生成角色" />
                }
              </div>
            </div>

            {loading && <p style={{ fontSize: 13, color: '#e11d5a', marginBottom: 16 }}>AI 正在设计角色群…</p>}

            {hasChars ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
                {project.characters.map((c, i) => {
                  const roleColor = c.role === '主角' ? { bg: '#eff6ff', text: '#3b82f6' }
                    : c.role === '女主' ? { bg: '#fff1f5', text: '#e11d5a' }
                    : c.role === '反派' ? { bg: '#fef2f2', text: '#dc2626' }
                    : { bg: '#f5f5f4', text: '#78716c' };

                  const Field = ({ label, value }: { label: string; value: string }) => (
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: '#a8a29e', fontWeight: 500, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                      <p style={{ fontSize: 13, color: value ? '#1c1917' : '#d6d3d1', lineHeight: 1.7 }}>{value || '—'}</p>
                    </div>
                  );

                  return (
                    <div key={c.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #ede9e3', overflow: 'hidden' }}>
                      {/* 角色头部 */}
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f5f4', display: 'flex', alignItems: 'center', gap: 10, background: '#fafaf9' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: roleColor.bg, color: roleColor.text }}>{c.role}</span>
                        <input value={c.name} onChange={e => {
                          const chars = project.characters.map((ch, j) => j === i ? { ...ch, name: e.target.value } : ch);
                          onChange({ ...project, characters: chars });
                        }}
                          style={{ fontSize: 16, fontWeight: 700, color: '#1c1917', background: 'transparent', border: 'none', outline: 'none', flex: 1 }} />
                        <button onClick={() => genOneCharacter(i)} disabled={loading}
                          className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px', gap: 5 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                          </svg>
                          AI 重新生成
                        </button>
                      </div>

                      {/* 角色档案 */}
                      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                        {/* 左列 */}
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#c4bfbb', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>基本信息</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                            <Field label="年龄" value={c.age} />
                            <Field label="性别" value={c.gender} />
                            <Field label="身高" value={c.height} />
                            <Field label="体型" value={c.build} />
                          </div>
                          <Field label="所属/职业" value={c.affiliation} />

                          <p style={{ fontSize: 11, fontWeight: 600, color: '#c4bfbb', margin: '16px 0 12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>外貌</p>
                          <Field label="发型" value={c.hairStyle} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                            <Field label="发色" value={c.hairColor} />
                            <Field label="眼睛" value={c.eyeColor} />
                          </div>
                          <Field label="肤色" value={c.skin} />
                          <Field label="日常服装" value={c.outfit} />
                          <Field label="标志配饰" value={c.accessories} />
                        </div>

                        {/* 右列 */}
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#c4bfbb', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>性格</p>
                          <Field label="性格关键词" value={c.personalityKeywords} />
                          <Field label="表面性格" value={c.publicFace} />
                          <Field label="真实性格" value={c.privateFace} />
                          <Field label="口调 / 一人称" value={c.speech} />
                          <Field label="优点" value={c.strengths} />
                          <Field label="缺点" value={c.weaknesses} />

                          <p style={{ fontSize: 11, fontWeight: 600, color: '#c4bfbb', margin: '16px 0 12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>内心</p>
                          <Field label="核心创伤" value={c.trauma} />
                          <Field label="行动驱动" value={c.motivation} />
                          <Field label="外在目标" value={c.goal} />
                          <Field label="角色弧线" value={c.arc} />
                          <Field label="习惯 / 小动作" value={c.habits} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '40px', border: '1px dashed #e7e5e4', borderRadius: 16, textAlign: 'center', color: '#c4bfbb', marginBottom: 20 }}>
                <p style={{ fontSize: 13 }}>点击「AI 生成角色」开始</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {!hasChars
                ? <AIButton onClick={genCharacters} loading={loading} label="AI 生成角色" />
                : <AIButton onClick={genPlot} loading={loading} label={`完成，AI 生成 ${numChapters} 章大纲`} />
              }
              <button onClick={() => onNavigate('characters')} className="btn-ghost" style={{ fontSize: 13 }}>前往详细编辑</button>
            </div>
          </div>
        )}

        {/* ── Step 4: 大纲 ── */}
        {step === 'plot' && (
          <div style={{ maxWidth: 680 }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', marginBottom: 4 }}>章节大纲</h2>
                <p style={{ fontSize: 13, color: '#a8a29e' }}>{hasPlot ? `共 ${project.chapters.length} 章，可直接修改各章概要` : 'AI 根据世界观和角色规划章节大纲'}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#a8a29e' }}>章节数</span>
                  <input type="number" value={numChapters} onChange={e => setNumChapters(Number(e.target.value))} min={3} max={50}
                    style={{ width: 60, padding: '4px 8px', border: '1px solid #ede9e3', borderRadius: 8, fontSize: 13, textAlign: 'center', outline: 'none' }} />
                </div>
                {hasPlot
                  ? <RegenButton onClick={genPlot} loading={loading} />
                  : <AIButton onClick={genPlot} loading={loading} label="AI 生成大纲" />
                }
              </div>
            </div>

            {loading && <p style={{ fontSize: 13, color: '#e11d5a', marginBottom: 16 }}>AI 正在规划章节大纲…</p>}

            {hasPlot ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {project.chapters.map(ch => (
                  <div key={ch.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #ede9e3', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, background: '#f5f5f4', color: '#78716c', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>第 {ch.number} 章</span>
                      <input value={ch.title} onChange={e => {
                        const chapters = project.chapters.map(c => c.id === ch.id ? { ...c, title: e.target.value } : c);
                        onChange({ ...project, chapters });
                      }}
                        style={{ fontSize: 14, fontWeight: 600, color: '#1c1917', background: 'transparent', border: 'none', outline: 'none', flex: 1, borderBottom: '1px solid transparent' }}
                        onFocus={e => e.currentTarget.style.borderBottomColor = '#e11d5a'}
                        onBlur={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                      />
                    </div>
                    <AutoArea value={ch.summary} minH={48}
                      onChange={v => {
                        const chapters = project.chapters.map(c => c.id === ch.id ? { ...c, summary: v } : c);
                        onChange({ ...project, chapters });
                      }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', border: '1px dashed #e7e5e4', borderRadius: 16, textAlign: 'center', color: '#c4bfbb', marginBottom: 20 }}>
                <p style={{ fontSize: 13 }}>点击「AI 生成大纲」开始</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {!hasPlot
                ? <AIButton onClick={genPlot} loading={loading} label="AI 生成大纲" />
                : <AIButton onClick={() => setStep('writing')} loading={false} label="完成，进入正文生成" />
              }
              <button onClick={() => onNavigate('plot')} className="btn-ghost" style={{ fontSize: 13 }}>前往详细编辑</button>
            </div>
          </div>
        )}

        {/* ── Step 5: 正文生成 ── */}
        {step === 'writing' && (
          <div style={{ maxWidth: 680 }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', marginBottom: 4 }}>正文生成</h2>
                <p style={{ fontSize: 13, color: '#a8a29e' }}>
                  {generatedChapters.size}/{project.chapters.length} 章已生成 · 共 {totalWords.toLocaleString()} 字
                </p>
              </div>
              <AIButton
                onClick={genAllChapters}
                loading={generatingChapter !== null}
                label="一键生成全部章节"
                disabled={project.chapters.length === 0}
              />
            </div>

            {error && <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</p>}

            {project.chapters.length === 0 ? (
              <div style={{ padding: '40px', border: '1px dashed #e7e5e4', borderRadius: 16, textAlign: 'center', color: '#c4bfbb' }}>
                <p style={{ fontSize: 13 }}>请先在「章节大纲」步骤生成大纲</p>
                <button onClick={() => setStep('plot')} className="btn-ghost" style={{ marginTop: 12, fontSize: 13 }}>返回大纲步骤</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {project.chapters.map(ch => {
                  const isDone       = generatedChapters.has(ch.number);
                  const isGenerating = generatingChapter === ch.number;
                  return (
                    <div key={ch.id} style={{
                      background: isDone ? '#f0fdf4' : isGenerating ? '#fff1f5' : '#fff',
                      borderRadius: 12,
                      border: `1px solid ${isDone ? '#bbf7d0' : isGenerating ? '#ffc7d8' : '#ede9e3'}`,
                      padding: '14px 16px',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
                            background: isDone ? '#dcfce7' : isGenerating ? '#ffc7d8' : '#f5f5f4',
                            color: isDone ? '#16a34a' : isGenerating ? '#e11d5a' : '#a8a29e',
                          }}>
                            {isDone
                              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              : isGenerating
                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                : ch.number}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1c1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              第 {ch.number} 章《{ch.title}》
                            </p>
                            {isDone && <p style={{ fontSize: 12, color: '#22c55e', marginTop: 2 }}>{ch.wordCount.toLocaleString()} 字已生成</p>}
                            {isGenerating && <p style={{ fontSize: 12, color: '#e11d5a', marginTop: 2 }}>正在生成…</p>}
                            {!isDone && !isGenerating && <p style={{ fontSize: 12, color: '#a8a29e', marginTop: 2 }} className="truncate">{ch.summary}</p>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {isDone && (
                            <button onClick={() => genChapter(ch)} disabled={generatingChapter !== null}
                              className="btn-ghost" style={{ fontSize: 12, padding: '5px 10px', gap: 4 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                              重写
                            </button>
                          )}
                          {!isDone && !isGenerating && (
                            <button onClick={() => genChapter(ch)} disabled={generatingChapter !== null}
                              className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                              AI 生成
                            </button>
                          )}
                          <button onClick={() => onNavigate('write')} className="btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}>
                            编辑
                          </button>
                        </div>
                      </div>
                      {isDone && ch.content && (
                        <p style={{ fontSize: 13, color: '#57534e', marginTop: 10, lineHeight: 1.7 }} className="line-clamp-2">
                          {ch.content.slice(0, 150)}…
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button onClick={() => onNavigate('write')} className="btn-primary">前往写作台编辑</button>
              <button onClick={() => onNavigate('revise')} className="btn-ghost" style={{ fontSize: 13 }}>推敲审查</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
