import React, { useState } from 'react';
import { Character, Project } from '../types';
import { newCharacter } from '../storage';
import { fillCharacterFromConcept } from '../generation';
import { Plus, Trash2, User, Wand2, ChevronRight, Loader2, Users } from 'lucide-react';

interface Props { project: Project; onChange: (p: Project) => void; }

const roles = ['主角', '女主', '反派', '配角', '其他'] as const;

function Field({ label, value, onChange, placeholder, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-ink-500 mb-1">{label}</label>
      {rows === 1 ? (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 rounded-lg border border-ink-200 text-sm text-ink-800 bg-white focus:outline-none focus:ring-1 focus:ring-sakura-300 placeholder-ink-300"
        />
      ) : (
        <textarea
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 rounded-lg border border-ink-200 text-sm text-ink-800 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-sakura-300 placeholder-ink-300"
        />
      )}
    </div>
  );
}

export default function CharacterPanel({ project, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(project.characters[0]?.id ?? null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [tab, setTab] = useState<'basic' | 'appearance' | 'personality' | 'inner' | 'relations'>('basic');

  const selected = project.characters.find(c => c.id === selectedId);

  const addChar = () => {
    const c = newCharacter();
    const updated = { ...project, characters: [...project.characters, c] };
    onChange(updated);
    setSelectedId(c.id);
  };

  const deleteChar = (id: string) => {
    const updated = { ...project, characters: project.characters.filter(c => c.id !== id) };
    onChange(updated);
    setSelectedId(updated.characters[0]?.id ?? null);
  };

  const updateChar = (patch: Partial<Character>) => {
    if (!selected) return;
    const chars = project.characters.map(c => c.id === selected.id ? { ...c, ...patch } : c);
    onChange({ ...project, characters: chars });
  };

  const runAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const result_obj = await fillCharacterFromConcept(
        project.summary, project.world.overview, aiPrompt
      );
      if (selected) {
        // 直接填入当前角色字段，保留已有的 id/createdAt
        updateChar({ ...result_obj });
        setAiResult('已自动填入当前角色的所有字段，可直接查看各标签页。');
      } else {
        // 没有选中角色时，新建一个
        const c = { ...newCharacter(), ...result_obj, name: (result_obj as any).name || '新角色' };
        onChange({ ...project, characters: [...project.characters, c] });
        setSelectedId(c.id);
        setAiResult('已创建新角色并填入设定。');
      }
    } catch (e: any) {
      setAiResult('错误：' + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const tabs = [
    { key: 'basic', label: '基本' },
    { key: 'appearance', label: '外貌' },
    { key: 'personality', label: '性格' },
    { key: 'inner', label: '内心' },
    { key: 'relations', label: '关系' },
  ] as const;

  return (
    <div className="flex h-full">
      {/* 角色列表 */}
      <div className="w-44 flex-shrink-0 border-r border-ink-200 bg-ink-50 flex flex-col">
        <div className="p-3 border-b border-ink-200 flex items-center justify-between">
          <span className="text-xs text-ink-400 font-medium flex items-center gap-1"><Users size={12}/>角色 {project.characters.length}</span>
          <button onClick={addChar} className="p-1 rounded-lg hover:bg-sakura-100 text-sakura-500 transition-colors">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {project.characters.length === 0 && (
            <p className="text-xs text-ink-300 text-center mt-6">点击 + 添加角色</p>
          )}
          {project.characters.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 text-left transition-all group ${
                selectedId === c.id ? 'bg-sakura-100 text-sakura-700' : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              <User size={13} />
              <span className="flex-1 truncate">{c.name}</span>
              <span className={`text-[10px] px-1.5 rounded-full ${
                c.role === '主角' ? 'bg-mist-100 text-mist-600' :
                c.role === '女主' ? 'bg-sakura-100 text-sakura-600' :
                c.role === '反派' ? 'bg-red-100 text-red-600' : 'bg-ink-100 text-ink-400'
              }`}>{c.role}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧编辑 */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="px-6 pt-4 pb-0 flex items-center justify-between border-b border-ink-100">
            <div className="flex items-center gap-3">
              <input
                value={selected.name}
                onChange={e => updateChar({ name: e.target.value })}
                className="text-lg font-medium text-ink-800 bg-transparent border-b-2 border-transparent focus:border-sakura-400 focus:outline-none"
              />
              <select
                value={selected.role}
                onChange={e => updateChar({ role: e.target.value as any })}
                className="text-xs border border-ink-200 rounded-full px-2 py-0.5 text-ink-600 bg-white focus:outline-none"
              >
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <button onClick={() => deleteChar(selected.id)} className="p-1.5 text-ink-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>

          {/* 标签页 */}
          <div className="flex gap-1 px-6 pt-2 border-b border-ink-100">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${
                  tab === t.key ? 'text-sakura-600 border-b-2 border-sakura-400 font-medium' : 'text-ink-400 hover:text-ink-600'
                }`}
              >{t.label}</button>
            ))}
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            {tab === 'basic' && (
              <div className="grid grid-cols-2 gap-x-4">
                <Field label="年龄" value={selected.age} onChange={v => updateChar({ age: v })} rows={1} placeholder="18岁" />
                <Field label="性别" value={selected.gender} onChange={v => updateChar({ gender: v })} rows={1} placeholder="女" />
                <Field label="身高" value={selected.height} onChange={v => updateChar({ height: v })} rows={1} placeholder="162cm" />
                <Field label="体型" value={selected.build} onChange={v => updateChar({ build: v })} rows={1} placeholder="纤细/标准/运动型" />
                <div className="col-span-2">
                  <Field label="所属/职业" value={selected.affiliation} onChange={v => updateChar({ affiliation: v })} rows={1} placeholder="魔法学院三年级/无所属冒险者" />
                </div>
                <div className="col-span-2">
                  <Field label="其他备注" value={selected.notes} onChange={v => updateChar({ notes: v })} rows={4} placeholder="其他需要记录的信息……" />
                </div>
              </div>
            )}

            {tab === 'appearance' && (
              <>
                <Field label="发型" value={selected.hairStyle} onChange={v => updateChar({ hairStyle: v })} rows={1} placeholder="齐刘海+腰部长直发" />
                <Field label="发色" value={selected.hairColor} onChange={v => updateChar({ hairColor: v })} rows={1} placeholder="漆黑（#1a1a2e）" />
                <Field label="眼睛颜色" value={selected.eyeColor} onChange={v => updateChar({ eyeColor: v })} rows={1} placeholder="深棕色（#4a3228）" />
                <Field label="眼型" value={selected.eyeShape} onChange={v => updateChar({ eyeShape: v })} rows={1} placeholder="大而圆润，眼尾微垂" />
                <Field label="肤色/肤质" value={selected.skin} onChange={v => updateChar({ skin: v })} rows={1} placeholder="瓷白色，半透明感" />
                <Field label="服装（日常/战斗）" value={selected.outfit} onChange={v => updateChar({ outfit: v })} rows={3} placeholder="白色学院制服，领口系蓝色蝴蝶结……" />
                <Field label="特征配饰" value={selected.accessories} onChange={v => updateChar({ accessories: v })} rows={2} placeholder="右耳一枚星形耳钉，标志性识别物" />
              </>
            )}

            {tab === 'personality' && (
              <>
                <Field label="性格关键词（5个）" value={selected.personalityKeywords} onChange={v => updateChar({ personalityKeywords: v })} rows={1} placeholder="认真/腹黑/外冷内热/善妒/献身" />
                <Field label="表面性格（社会面具）" value={selected.publicFace} onChange={v => updateChar({ publicFace: v })} rows={3} placeholder="他人眼中冷静自持，不苟言笑……" />
                <Field label="真实性格（亲密面）" value={selected.privateFace} onChange={v => updateChar({ privateFace: v })} rows={3} placeholder="私下其实话多，爱撒娇，害怕被抛弃……" />
                <Field label="优点" value={selected.strengths} onChange={v => updateChar({ strengths: v })} rows={2} placeholder="忠诚/观察力敏锐/临危不乱" />
                <Field label="缺点" value={selected.weaknesses} onChange={v => updateChar({ weaknesses: v })} rows={2} placeholder="不善表达/自我牺牲过度/偏执" />
                <Field label="口调/一人称" value={selected.speech} onChange={v => updateChar({ speech: v })} rows={2} placeholder="一人称「我」，少用敬语，习惯在句尾加「……」表示迟疑" />
              </>
            )}

            {tab === 'inner' && (
              <>
                <Field label="核心创伤" value={selected.trauma} onChange={v => updateChar({ trauma: v })} rows={3} placeholder="幼年时目睹父母因战乱分离，形成对「失去」的极度恐惧……" />
                <Field label="行动原理（最深的驱动）" value={selected.motivation} onChange={v => updateChar({ motivation: v })} rows={2} placeholder="「我不想再失去任何人」——保护欲驱使所有行动" />
                <Field label="外在目标" value={selected.goal} onChange={v => updateChar({ goal: v })} rows={2} placeholder="成为最强的护卫骑士，保护公主" />
                <Field label="角色弧线" value={selected.arc} onChange={v => updateChar({ arc: v })} rows={3} placeholder="开始：以力量压制一切↓中期：因无力感崩溃↓结局：接受自身局限，学会信任他人" />
                <Field label="喜好" value={selected.likes} onChange={v => updateChar({ likes: v })} rows={1} placeholder="甜食/夜晚散步/小动物" />
                <Field label="厌恶" value={selected.dislikes} onChange={v => updateChar({ dislikes: v })} rows={1} placeholder="被人怜悯/背叛/密闭空间" />
                <Field label="习惯/小动作" value={selected.habits} onChange={v => updateChar({ habits: v })} rows={2} placeholder="紧张时会摸耳垂/思考时盯着某处发呆" />
              </>
            )}

            {tab === 'relations' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-ink-600 font-medium">人物关系</span>
                  <button
                    onClick={() => updateChar({ relations: [...selected.relations, { name: '', type: '', feeling: '' }] })}
                    className="flex items-center gap-1 text-xs text-sakura-500 hover:text-sakura-600"
                  >
                    <Plus size={12} />添加关系
                  </button>
                </div>
                {selected.relations.map((rel, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input
                      value={rel.name}
                      onChange={e => {
                        const rels = [...selected.relations];
                        rels[i] = { ...rels[i], name: e.target.value };
                        updateChar({ relations: rels });
                      }}
                      placeholder="角色名"
                      className="w-24 px-2 py-1 rounded border border-ink-200 text-sm"
                    />
                    <input
                      value={rel.type}
                      onChange={e => {
                        const rels = [...selected.relations];
                        rels[i] = { ...rels[i], type: e.target.value };
                        updateChar({ relations: rels });
                      }}
                      placeholder="关系（恋人/师徒）"
                      className="flex-1 px-2 py-1 rounded border border-ink-200 text-sm"
                    />
                    <input
                      value={rel.feeling}
                      onChange={e => {
                        const rels = [...selected.relations];
                        rels[i] = { ...rels[i], feeling: e.target.value };
                        updateChar({ relations: rels });
                      }}
                      placeholder="情感（爱/敬畏）"
                      className="flex-1 px-2 py-1 rounded border border-ink-200 text-sm"
                    />
                    <button
                      onClick={() => {
                        const rels = selected.relations.filter((_, j) => j !== i);
                        updateChar({ relations: rels });
                      }}
                      className="text-ink-300 hover:text-red-400"
                    ><Trash2 size={12} /></button>
                  </div>
                ))}
                {selected.relations.length === 0 && (
                  <p className="text-sm text-ink-300 text-center py-6">暂无人物关系，点击「添加关系」</p>
                )}
              </div>
            )}
          </div>

          {/* AI 角色生成 */}
          <div className="border-t border-ink-100 p-4 bg-ink-50">
            <div className="flex gap-2">
              <input
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="描述角色概念，让 AI 生成设定……（例：一个腹黑的图书馆少女）"
                className="flex-1 px-3 py-1.5 rounded-lg border border-ink-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sakura-300"
              />
              <button
                onClick={runAI}
                disabled={aiLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-sakura-500 hover:bg-sakura-600 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
              >
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                AI生成
              </button>
            </div>
            {aiResult && (
              <div className="mt-2 p-3 bg-white rounded-lg border border-ink-200 text-xs text-ink-700 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin whitespace-pre-wrap">
                {aiResult}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-ink-300">
          <div className="text-center">
            <User size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">从左侧选择角色，或点击 + 新建</p>
          </div>
        </div>
      )}
    </div>
  );
}
