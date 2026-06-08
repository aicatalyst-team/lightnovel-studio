import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { fillWorldField } from '../generation';

interface Props { project: Project; onChange: (p: Project) => void; }

const SECTIONS = [
  { key: 'overview',      label: '世界概况',   hint: '描述世界的整体设定，核心规则，独特之处……' },
  { key: 'era',           label: '时代背景',   hint: '时代、年代、历史背景，故事发生在什么时期……' },
  { key: 'geography',     label: '地理环境',   hint: '重要地点、城市、区域，附带画面感的描述……' },
  { key: 'organizations', label: '势力组织',   hint: '国家、组织、派系及相互关系……' },
  { key: 'magicSystem',   label: '能力体系',   hint: '魔法、异能、科技体系的规则、等级和限制……' },
  { key: 'constraints',   label: '禁用词汇',   hint: '这个世界不存在的现代词汇和概念，写作时禁止使用……' },
  { key: 'notes',         label: '其他备注',   hint: '其他零散但重要的设定细节……' },
] as const;

function AutoArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = Math.max(96, ref.current.scrollHeight) + 'px';
    }
  }, [value]);
  return (
    <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
      className="field-input scrollbar-thin"
      style={{ resize: 'none', overflow: 'hidden', minHeight: 96, lineHeight: 1.8, fontSize: 14 }} />
  );
}

export default function WorldPanel({ project, onChange }: Props) {
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);

  const update = (key: string, val: string) => onChange({ ...project, world: { ...project.world, [key]: val } });

  const fillWithAI = async (key: string, label: string, value: string) => {
    if (!project.summary) { alert('请先在「AI 创作引导」页填写作品概念'); return; }
    setAiLoadingKey(key);
    try {
      const result = await fillWorldField(project.summary, project.genre, label, value);
      update(key, result);
    } catch (e: any) {
      alert('生成失败：' + e.message);
    } finally {
      setAiLoadingKey(null);
    }
  };

  const totalWords = Object.values(project.world).join('').replace(/\s/g, '').length;

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#f9f7f4' }} className="scrollbar-thin">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 28px 64px' }}>

        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #ede9e3' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1917' }}>世界观设定</h2>
          <span style={{ fontSize: 12, color: '#a8a29e' }}>{totalWords.toLocaleString()} 字</span>
        </div>

        {/* 所有字段平铺一页 */}
        {SECTIONS.map(s => {
          const val = project.world[s.key as keyof typeof project.world];
          const loading = aiLoadingKey === s.key;
          return (
            <div key={s.key} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#44403c' }}>{s.label}</label>
                  {s.key === 'constraints' && (
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20 }}>推敲时自动检查</span>
                  )}
                </div>
                <button onClick={() => fillWithAI(s.key, s.label, val)} disabled={aiLoadingKey !== null}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid #ede9e3', background: loading ? '#f5f5f4' : '#fff', color: loading ? '#a8a29e' : '#78716c', fontSize: 12, cursor: aiLoadingKey !== null ? 'not-allowed' : 'pointer', transition: 'all 0.12s', opacity: aiLoadingKey !== null && !loading ? 0.5 : 1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={loading ? { animation: 'spin 1s linear infinite' } : {}}>
                    {loading ? <path d="M21 12a9 9 0 1 1-6.219-8.56" /> : <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />}
                  </svg>
                  {loading ? '生成中…' : 'AI 填充'}
                </button>
              </div>
              <AutoArea value={val} onChange={v => update(s.key, v)} placeholder={s.hint} />
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
