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
      ref.current.style.height = Math.max(120, ref.current.scrollHeight) + 'px';
    }
  }, [value]);
  return (
    <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
      className="field-input scrollbar-thin"
      style={{ resize: 'none', overflow: 'hidden', minHeight: 120, lineHeight: 1.8, fontSize: 14 }} />
  );
}

export default function WorldPanel({ project, onChange }: Props) {
  const [active, setActive] = useState<string>('overview');
  const [aiLoading, setAiLoading] = useState(false);

  const current = SECTIONS.find(s => s.key === active)!;
  const worldValue = project.world[active as keyof typeof project.world];

  const update = (val: string) => onChange({ ...project, world: { ...project.world, [active]: val } });

  const fillWithAI = async () => {
    if (!project.summary) { alert('请先在 AI 创作引导页填写作品概念'); return; }
    setAiLoading(true);
    try {
      const result = await fillWorldField(project.summary, project.genre, current.label, worldValue);
      update(result);
    } catch (e: any) {
      alert('生成失败：' + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const wordCount = worldValue.replace(/\s/g, '').length;
  const totalWords = Object.values(project.world).join('').replace(/\s/g, '').length;

  return (
    <div style={{ display: 'flex', height: '100%' }}>

      {/* 左侧分类导航 */}
      <div style={{ width: 180, flexShrink: 0, borderRight: '1px solid #ede9e3', background: '#faf9f7', display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid #ede9e3', marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: '#a8a29e', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>世界观设定</p>
          <p style={{ fontSize: 11, color: '#c4bfbb', marginTop: 4 }}>{totalWords.toLocaleString()} 字</p>
        </div>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setActive(s.key)}
            style={{
              width: '100%', padding: '9px 16px', border: 'none', cursor: 'pointer',
              textAlign: 'left', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: active === s.key ? 'rgba(225,29,90,0.08)' : 'transparent',
              color: active === s.key ? '#e11d5a' : '#78716c',
              fontWeight: active === s.key ? 500 : 400,
              boxShadow: active === s.key ? 'inset 3px 0 0 #e11d5a' : 'none',
              transition: 'all 0.1s',
            }}>
            <span>{s.label}</span>
            {project.world[s.key as keyof typeof project.world] && (
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: active === s.key ? '#e11d5a' : '#d6d3d1', flexShrink: 0 }} />
            )}
          </button>
        ))}
      </div>

      {/* 右侧编辑区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 面板头 */}
        <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #ede9e3', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1c1917' }}>{current.label}</h2>
            {active === 'constraints' && (
              <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, marginTop: 4, display: 'inline-block' }}>推敲时自动检查</span>
            )}
          </div>
          <button onClick={fillWithAI} disabled={aiLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid #ede9e3', background: aiLoading ? '#f5f5f4' : '#fff', color: '#78716c', fontSize: 13, cursor: aiLoading ? 'not-allowed' : 'pointer', transition: 'all 0.12s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            {aiLoading ? 'AI 生成中…' : 'AI 填充此项'}
          </button>
        </div>

        {/* 编辑主体 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }} className="scrollbar-thin">
          <p style={{ fontSize: 12, color: '#b3a694', marginBottom: 12, lineHeight: 1.6 }}>{current.hint}</p>
          <AutoArea value={worldValue} onChange={update} placeholder={current.hint} />
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, color: '#c4bfbb' }}>{wordCount.toLocaleString()} 字</span>
          </div>
        </div>
      </div>
    </div>
  );
}
