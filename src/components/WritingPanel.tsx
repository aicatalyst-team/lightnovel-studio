import React, { useState, useRef, useEffect } from 'react';
import { Project, Chapter } from '../types';
import { newChapter } from '../storage';
import { continueWriting, generateDialogue, generateScene } from '../generation';
import { Plus, Wand2, MessageSquare, Loader2, BookOpen, PenLine, ChevronRight, Copy, Check, Trash2, Download, Maximize2, Minimize2 } from 'lucide-react';

interface Props { project: Project; onChange: (p: Project) => void; }

type AIMode = 'continue' | 'dialogue' | 'scene';

export default function WritingPanel({ project, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(project.chapters[0]?.id ?? null);
  const [aiMode, setAiMode] = useState<AIMode>('continue');
  const [aiInput, setAiInput] = useState('');
  const [aiCharName, setAiCharName] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = project.chapters.find(c => c.id === selectedId);
  const totalWords = project.chapters.reduce((s, c) => s + c.wordCount, 0);

  const addChapter = () => {
    const ch = newChapter(project.chapters.length + 1);
    onChange({ ...project, chapters: [...project.chapters, ch] });
    setSelectedId(ch.id);
  };

  const deleteChapter = (id: string) => {
    if (!window.confirm('确定删除这一章？内容无法恢复。')) return;
    const chapters = project.chapters
      .filter(c => c.id !== id)
      .map((c, i) => ({ ...c, number: i + 1 }));
    onChange({ ...project, chapters });
    setSelectedId(chapters[0]?.id ?? null);
  };

  const updateContent = (content: string) => {
    if (!selected) return;
    const wordCount = content.replace(/\s/g, '').length;
    onChange({ ...project, chapters: project.chapters.map(c => c.id === selected.id ? { ...c, content, wordCount } : c) });
  };

  const exportTxt = () => {
    const content = project.chapters
      .filter(c => c.content)
      .map(c => `第${c.number}章　${c.title}\n\n${c.content}`)
      .join('\n\n\n');
    if (!content) { alert('暂无正文内容可导出'); return; }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.title}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const runAI = async () => {
    if (!selected) return;
    setAiLoading(true); setAiResult('');
    try {
      let result = '';
      if (aiMode === 'continue') {
        result = await continueWriting(project, selected, aiInput);
      } else if (aiMode === 'dialogue') {
        const charName = aiCharName || project.characters[0]?.name || '';
        if (!charName) throw new Error('请先在角色页添加角色');
        result = await generateDialogue(project, charName, aiInput);
      } else {
        result = await generateScene(project, aiInput);
      }
      setAiResult(result);
    } catch (e: any) {
      setAiResult('错误：' + e.message);
    } finally { setAiLoading(false); }
  };

  const insertResult = () => {
    if (!selected || !aiResult) return;
    updateContent(selected.content ? selected.content + '\n\n' + aiResult : aiResult);
    setAiResult('');
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const aiModes = [
    { key: 'continue' as AIMode, label: '续写', icon: PenLine, placeholder: '输入续写方向（可留空自动续写）……' },
    { key: 'dialogue' as AIMode, label: '对话', icon: MessageSquare, placeholder: '描述情境：角色正在经历什么，情绪状态……' },
    { key: 'scene' as AIMode, label: '场景', icon: Wand2, placeholder: '描述场景：地点、时间、发生了什么、氛围……' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>

      {/* 章节列表（沉浸模式隐藏） */}
      {!immersive && (
        <div style={{ width: 168, flexShrink: 0, borderRight: '1px solid #ede9e3', background: '#fafaf9', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid #ede9e3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#78716c' }}>章节</p>
              <p style={{ fontSize: 11, color: '#c4bfbb', marginTop: 2 }}>{totalWords.toLocaleString()} 字</p>
            </div>
            <button onClick={addChapter} style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#e11d5a' }}>
              <Plus size={14} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '6px' }} className="scrollbar-thin">
            {project.chapters.length === 0 && <p style={{ fontSize: 12, color: '#d6d3d1', textAlign: 'center', marginTop: 24 }}>点击 + 新建章节</p>}
            {project.chapters.map(ch => (
              <div key={ch.id}
                onClick={() => setSelectedId(ch.id)}
                className="chapter-card"
                style={{
                  background: selectedId === ch.id ? 'rgba(225,29,90,0.08)' : undefined,
                  boxShadow: selectedId === ch.id ? 'inset 3px 0 0 #e11d5a' : undefined,
                  position: 'relative',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: selectedId === ch.id ? '#e11d5a' : '#44403c', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.title}
                  </p>
                  <button onClick={e => { e.stopPropagation(); deleteChapter(ch.id); }}
                    style={{ padding: 2, border: 'none', background: 'transparent', cursor: 'pointer', color: '#d6d3d1', flexShrink: 0, opacity: 0 }}
                    className="delete-btn">
                    <Trash2 size={11} />
                  </button>
                </div>
                <p style={{ fontSize: 11, color: '#a8a29e', marginTop: 2 }}>{ch.wordCount.toLocaleString()} 字</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 写作区 */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 正文编辑器 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <div style={{ padding: '12px 32px', borderBottom: '1px solid #f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1c1917' }}>第{selected.number}章　{selected.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#a8a29e' }}>{selected.wordCount.toLocaleString()} 字</span>
                <button onClick={exportTxt} title="导出全文 TXT"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #ede9e3', borderRadius: 8, background: '#fff', color: '#78716c', fontSize: 12, cursor: 'pointer' }}>
                  <Download size={12} /> 导出
                </button>
                <button onClick={() => setImmersive(!immersive)} title="沉浸模式"
                  style={{ padding: '5px 8px', border: '1px solid #ede9e3', borderRadius: 8, background: '#fff', color: '#78716c', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {immersive ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
                <button onClick={() => setAiOpen(!aiOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                    border: `1px solid ${aiOpen ? '#ffc7d8' : '#ede9e3'}`, borderRadius: 8,
                    background: aiOpen ? '#fff1f5' : '#fff', color: aiOpen ? '#e11d5a' : '#78716c',
                    fontSize: 12, cursor: 'pointer',
                  }}>
                  <Wand2 size={12} /> AI 助手
                </button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '32px 64px', overflow: 'auto', maxWidth: 900, margin: '0 auto', width: '100%' }} className="scrollbar-thin">
              <textarea
                ref={textareaRef}
                value={selected.content}
                onChange={e => updateContent(e.target.value)}
                placeholder={'　　开始写作……\n\n　　每段首行缩进，保持第三人称过去时，善用五感描写。'}
                className="writing-area"
                style={{ width: '100%', minHeight: 'calc(100vh - 200px)', resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: '#1c1917' }}
              />
            </div>
          </div>

          {/* AI 助手面板 */}
          {aiOpen && (
            <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid #ede9e3', background: '#fafaf9', display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #ede9e3' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 10 }}>AI 写作助手</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {aiModes.map(m => {
                    const MIcon = m.icon;
                    return (
                      <button key={m.key} onClick={() => { setAiMode(m.key); setAiInput(''); }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          padding: '6px 4px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer',
                          background: aiMode === m.key ? '#e11d5a' : '#fff',
                          color: aiMode === m.key ? '#fff' : '#78716c',
                          boxShadow: aiMode === m.key ? 'none' : 'inset 0 0 0 1px #ede9e3',
                        }}>
                        <MIcon size={11} />{m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: '12px 16px', borderBottom: '1px solid #ede9e3' }}>
                {aiMode === 'dialogue' && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: 'block', fontSize: 11, color: '#a8a29e', marginBottom: 4 }}>说话角色</label>
                    <select value={aiCharName || project.characters[0]?.name || ''}
                      onChange={e => setAiCharName(e.target.value)} className="field-input" style={{ fontSize: 12, padding: '6px 10px' }}>
                      {project.characters.length === 0
                        ? <option>（请先添加角色）</option>
                        : project.characters.map(c => <option key={c.id} value={c.name}>{c.name}（{c.role}）</option>)
                      }
                    </select>
                  </div>
                )}
                <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} rows={3}
                  placeholder={aiModes.find(m => m.key === aiMode)?.placeholder}
                  className="field-input scrollbar-thin" style={{ resize: 'none', fontSize: 12, lineHeight: 1.7 }} />
                <button onClick={runAI} disabled={aiLoading} className="btn-primary" style={{ marginTop: 8, width: '100%', justifyContent: 'center', fontSize: 13 }}>
                  {aiLoading ? <><Loader2 size={13} className="animate-spin" /> 生成中…</> : <><Wand2 size={13} /> 生成</>}
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }} className="scrollbar-thin">
                {aiResult ? (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#a8a29e' }}>生成结果</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={copyResult} style={{ padding: '3px 8px', border: '1px solid #ede9e3', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#78716c' }}>
                          {copied ? <Check size={11} style={{ color: '#22c55e' }} /> : <Copy size={11} />}
                          {copied ? '已复制' : '复制'}
                        </button>
                        <button onClick={insertResult} style={{ padding: '3px 8px', border: '1px solid #ffc7d8', borderRadius: 6, background: '#fff1f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#e11d5a' }}>
                          <ChevronRight size={11} /> 插入
                        </button>
                      </div>
                    </div>
                    <div className="writing-area" style={{ fontSize: 12, color: '#44403c', background: '#fff', borderRadius: 10, padding: '12px', border: '1px solid #ede9e3', whiteSpace: 'pre-wrap', lineHeight: 2 }}>
                      {aiResult}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#d6d3d1', marginTop: 32 }}>
                    <Wand2 size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ fontSize: 12 }}>选择模式，输入指令<br />生成内容后可直接插入正文</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6d3d1', flexDirection: 'column', gap: 12 }}>
          <PenLine size={40} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>从左侧选择章节，或点击 + 新建</p>
          <button onClick={exportTxt} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #ede9e3', borderRadius: 10, background: '#fff', color: '#78716c', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
            <Download size={13} /> 导出全文 TXT
          </button>
        </div>
      )}

      <style>{`
        .chapter-card:hover .delete-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
