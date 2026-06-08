import React, { useState } from 'react';
import { Character, Project } from '../types';
import { newCharacter } from '../storage';
import { fillCharacterFromConcept } from '../generation';
import { Plus, Trash2, User, Wand2, Loader2, Users } from 'lucide-react';

interface Props { project: Project; onChange: (p: Project) => void; }

const roles = ['主角', '女主', '反派', '配角', '其他'] as const;

function roleColor(role: string) {
  if (role === '主角') return { bg: '#eff6ff', text: '#3b82f6' };
  if (role === '女主') return { bg: '#fff1f5', text: '#e11d5a' };
  if (role === '反派') return { bg: '#fef2f2', text: '#dc2626' };
  return { bg: '#f5f5f4', text: '#78716c' };
}

function Field({ label, value, onChange, placeholder, rows = 2, full = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; full?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12, gridColumn: full ? '1 / -1' : undefined }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#78716c', marginBottom: 4 }}>{label}</label>
      {rows === 1 ? (
        <input className="field-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <textarea className="field-input scrollbar-thin" rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ resize: 'none', lineHeight: 1.7 }} />
      )}
    </div>
  );
}

function Group({ title, cols = 1, children }: { title: string; cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#c4bfbb', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</p>
      <div style={{ display: 'grid', gridTemplateColumns: cols === 2 ? '1fr 1fr' : '1fr', gap: '0 16px' }}>{children}</div>
    </div>
  );
}

export default function CharacterPanel({ project, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(project.characters[0]?.id ?? null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');

  const selected = project.characters.find(c => c.id === selectedId);

  const addChar = () => {
    const c = newCharacter();
    onChange({ ...project, characters: [...project.characters, c] });
    setSelectedId(c.id);
  };
  const deleteChar = (id: string) => {
    const updated = { ...project, characters: project.characters.filter(c => c.id !== id) };
    onChange(updated);
    setSelectedId(updated.characters[0]?.id ?? null);
  };
  const updateChar = (patch: Partial<Character>) => {
    if (!selected) return;
    onChange({ ...project, characters: project.characters.map(c => c.id === selected.id ? { ...c, ...patch } : c) });
  };

  const runAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiResult('');
    try {
      const result_obj = await fillCharacterFromConcept(project.summary, project.world.overview, aiPrompt);
      if (selected) {
        updateChar({ ...result_obj });
        setAiResult('已自动填入当前角色的所有字段。');
      } else {
        const c = { ...newCharacter(), ...result_obj, name: (result_obj as any).name || '新角色' };
        onChange({ ...project, characters: [...project.characters, c] });
        setSelectedId(c.id);
        setAiResult('已创建新角色并填入设定。');
      }
    } catch (e: any) {
      setAiResult('错误：' + e.message);
    } finally { setAiLoading(false); }
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* 角色列表 */}
      <div style={{ width: 176, flexShrink: 0, borderRight: '1px solid #ede9e3', background: '#faf9f7', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #ede9e3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#a8a29e', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} />角色 {project.characters.length}</span>
          <button onClick={addChar} style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#e11d5a', display: 'flex' }}><Plus size={14} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }} className="scrollbar-thin">
          {project.characters.length === 0 && <p style={{ fontSize: 12, color: '#d6d3d1', textAlign: 'center', marginTop: 24 }}>点击 + 添加角色</p>}
          {project.characters.map(c => {
            const rc = roleColor(c.role);
            const on = selectedId === c.id;
            return (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, marginBottom: 2, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, background: on ? 'rgba(225,29,90,0.08)' : 'transparent', color: on ? '#e11d5a' : '#57534e', transition: 'all 0.1s' }}>
                <User size={13} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: rc.bg, color: rc.text, flexShrink: 0 }}>{c.role}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧编辑：单页平铺 */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 头部 */}
          <div style={{ padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ede9e3', background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input value={selected.name} onChange={e => updateChar({ name: e.target.value })}
                style={{ fontSize: 18, fontWeight: 600, color: '#1c1917', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderBottomColor = '#e11d5a'} onBlur={e => e.currentTarget.style.borderBottomColor = 'transparent'} />
              <select value={selected.role} onChange={e => updateChar({ role: e.target.value as any })}
                style={{ fontSize: 12, border: '1px solid #e7e5e4', borderRadius: 20, padding: '2px 10px', color: '#57534e', background: '#fff', outline: 'none', cursor: 'pointer' }}>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <button onClick={() => deleteChar(selected.id)} style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#d6d3d1', display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = '#dc2626'} onMouseLeave={e => e.currentTarget.style.color = '#d6d3d1'}><Trash2 size={15} /></button>
          </div>

          {/* 所有字段平铺，可滚动 */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }} className="scrollbar-thin">
            <Group title="基本信息" cols={2}>
              <Field label="年龄" value={selected.age} onChange={v => updateChar({ age: v })} rows={1} placeholder="18岁" />
              <Field label="性别" value={selected.gender} onChange={v => updateChar({ gender: v })} rows={1} placeholder="女" />
              <Field label="身高" value={selected.height} onChange={v => updateChar({ height: v })} rows={1} placeholder="162cm" />
              <Field label="体型" value={selected.build} onChange={v => updateChar({ build: v })} rows={1} placeholder="纤细/标准/运动型" />
              <Field label="所属/职业" value={selected.affiliation} onChange={v => updateChar({ affiliation: v })} rows={1} placeholder="魔法学院三年级" full />
              <Field label="其他备注" value={selected.notes} onChange={v => updateChar({ notes: v })} rows={3} placeholder="其他需要记录的信息……" full />
            </Group>

            <Group title="外貌" cols={2}>
              <Field label="发型" value={selected.hairStyle} onChange={v => updateChar({ hairStyle: v })} rows={1} placeholder="齐刘海+腰部长直发" full />
              <Field label="发色" value={selected.hairColor} onChange={v => updateChar({ hairColor: v })} rows={1} placeholder="漆黑" />
              <Field label="眼睛颜色" value={selected.eyeColor} onChange={v => updateChar({ eyeColor: v })} rows={1} placeholder="深棕色" />
              <Field label="眼型" value={selected.eyeShape} onChange={v => updateChar({ eyeShape: v })} rows={1} placeholder="大而圆润，眼尾微垂" />
              <Field label="肤色/肤质" value={selected.skin} onChange={v => updateChar({ skin: v })} rows={1} placeholder="瓷白色" />
              <Field label="服装（日常/战斗）" value={selected.outfit} onChange={v => updateChar({ outfit: v })} rows={3} placeholder="白色学院制服，领口系蓝色蝴蝶结……" full />
              <Field label="特征配饰" value={selected.accessories} onChange={v => updateChar({ accessories: v })} rows={2} placeholder="右耳一枚星形耳钉" full />
            </Group>

            <Group title="性格">
              <Field label="性格关键词（5个）" value={selected.personalityKeywords} onChange={v => updateChar({ personalityKeywords: v })} rows={1} placeholder="认真/腹黑/外冷内热/善妒/献身" />
              <Field label="表面性格（社会面具）" value={selected.publicFace} onChange={v => updateChar({ publicFace: v })} rows={3} placeholder="他人眼中冷静自持，不苟言笑……" />
              <Field label="真实性格（亲密面）" value={selected.privateFace} onChange={v => updateChar({ privateFace: v })} rows={3} placeholder="私下其实话多，爱撒娇……" />
              <Field label="优点" value={selected.strengths} onChange={v => updateChar({ strengths: v })} rows={2} placeholder="忠诚/观察力敏锐/临危不乱" />
              <Field label="缺点" value={selected.weaknesses} onChange={v => updateChar({ weaknesses: v })} rows={2} placeholder="不善表达/自我牺牲过度/偏执" />
              <Field label="口调/一人称" value={selected.speech} onChange={v => updateChar({ speech: v })} rows={2} placeholder="一人称「我」，少用敬语，句尾常加「……」" />
            </Group>

            <Group title="内心">
              <Field label="核心创伤" value={selected.trauma} onChange={v => updateChar({ trauma: v })} rows={3} placeholder="幼年目睹父母因战乱分离，形成对「失去」的极度恐惧……" />
              <Field label="行动原理（最深的驱动）" value={selected.motivation} onChange={v => updateChar({ motivation: v })} rows={2} placeholder="「我不想再失去任何人」" />
              <Field label="外在目标" value={selected.goal} onChange={v => updateChar({ goal: v })} rows={2} placeholder="成为最强的护卫骑士" />
              <Field label="角色弧线" value={selected.arc} onChange={v => updateChar({ arc: v })} rows={3} placeholder="开始：以力量压制一切 → 中期：因无力感崩溃 → 结局：学会信任他人" />
              <Field label="喜好" value={selected.likes} onChange={v => updateChar({ likes: v })} rows={1} placeholder="甜食/夜晚散步/小动物" />
              <Field label="厌恶" value={selected.dislikes} onChange={v => updateChar({ dislikes: v })} rows={1} placeholder="被人怜悯/背叛/密闭空间" />
              <Field label="习惯/小动作" value={selected.habits} onChange={v => updateChar({ habits: v })} rows={2} placeholder="紧张时摸耳垂/思考时盯着某处发呆" />
            </Group>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#c4bfbb', textTransform: 'uppercase', letterSpacing: '0.1em' }}>人物关系</p>
                <button onClick={() => updateChar({ relations: [...selected.relations, { name: '', type: '', feeling: '' }] })}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#e11d5a', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <Plus size={12} />添加关系
                </button>
              </div>
              {selected.relations.length === 0 && <p style={{ fontSize: 13, color: '#d6d3d1', textAlign: 'center', padding: '16px 0' }}>暂无人物关系</p>}
              {selected.relations.map((rel, i) => {
                const upd = (patch: Partial<typeof rel>) => { const rels = [...selected.relations]; rels[i] = { ...rels[i], ...patch }; updateChar({ relations: rels }); };
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input className="field-input" style={{ width: 100 }} value={rel.name} onChange={e => upd({ name: e.target.value })} placeholder="角色名" />
                    <input className="field-input" style={{ flex: 1 }} value={rel.type} onChange={e => upd({ type: e.target.value })} placeholder="关系（恋人/师徒）" />
                    <input className="field-input" style={{ flex: 1 }} value={rel.feeling} onChange={e => upd({ feeling: e.target.value })} placeholder="情感（爱/敬畏）" />
                    <button onClick={() => updateChar({ relations: selected.relations.filter((_, j) => j !== i) })}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#d6d3d1', display: 'flex', flexShrink: 0 }}><Trash2 size={13} /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI 角色生成 */}
          <div style={{ borderTop: '1px solid #ede9e3', padding: 16, background: '#faf9f7', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="field-input" style={{ flex: 1 }}
                placeholder="描述角色概念，让 AI 生成设定……（例：一个腹黑的图书馆少女）" />
              <button onClick={runAI} disabled={aiLoading} className="btn-primary" style={{ flexShrink: 0 }}>
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                AI 生成
              </button>
            </div>
            {aiResult && (
              <div style={{ marginTop: 8, padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #ede9e3', fontSize: 12, color: '#57534e', lineHeight: 1.6 }}>{aiResult}</div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6d3d1', flexDirection: 'column', gap: 12 }}>
          <User size={40} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>从左侧选择角色，或点击 + 新建</p>
        </div>
      )}
    </div>
  );
}
