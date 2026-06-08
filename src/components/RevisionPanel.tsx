import React, { useState } from 'react';
import { Project } from '../types';
import { checkConsistency, evaluateReaderExperience } from '../generation';
import { ShieldCheck, Eye, Loader2, FileSearch, ChevronDown } from 'lucide-react';

interface Props { project: Project; }

type Phase = 'consistency' | 'reader';

export default function RevisionPanel({ project }: Props) {
  const [phase, setPhase] = useState<Phase>('consistency');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(project.chapters[0]?.id ?? '');
  const [customText, setCustomText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const selectedChapter = project.chapters.find(c => c.id === selectedChapterId);

  const run = async () => {
    setLoading(true);
    setResult('');
    try {
      const text = customText || selectedChapter?.content || '';
      if (!text.trim()) { setResult('请先选择章节或输入需要审查的文本。'); return; }
      if (phase === 'consistency') {
        setResult(await checkConsistency(project, text));
      } else {
        setResult(await evaluateReaderExperience(project, text));
      }
    } catch (e: any) {
      setResult('错误：' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const phases = [
    {
      key: 'consistency' as Phase,
      label: 'Phase B · 整合性审查',
      icon: ShieldCheck,
      desc: '检查角色口调一致性、时代禁用词汇、感官描写充分度、逻辑矛盾',
      color: 'text-mist-600',
      bg: 'bg-mist-50',
      border: 'border-mist-300',
      active: 'bg-mist-500'
    },
    {
      key: 'reader' as Phase,
      label: 'Phase C · 读者体验评估',
      icon: Eye,
      desc: '从读者视角评估主题表现、情感曲线、代入感，并给出修改建议',
      color: 'text-sakura-600',
      bg: 'bg-sakura-50',
      border: 'border-sakura-300',
      active: 'bg-sakura-500'
    },
  ];

  const currentPhase = phases.find(p => p.key === phase)!;

  return (
    <div className="flex h-full">
      {/* 左侧设置 */}
      <div className="w-72 flex-shrink-0 border-r border-ink-200 bg-ink-50 flex flex-col p-5">
        <h2 className="text-sm font-medium text-ink-700 mb-4 flex items-center gap-2">
          <FileSearch size={16} className="text-ink-400" />
          推敲与审查
        </h2>

        {/* Phase 选择 */}
        <div className="space-y-2 mb-5">
          {phases.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => setPhase(p.key)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  phase === p.key ? `${p.border} ${p.bg}` : 'border-ink-200 bg-white hover:border-ink-300'
                }`}
              >
                <div className={`flex items-center gap-2 text-sm font-medium ${phase === p.key ? p.color : 'text-ink-600'}`}>
                  <Icon size={14} />
                  {p.label}
                </div>
                <p className="text-xs text-ink-400 mt-1 leading-relaxed">{p.desc}</p>
              </button>
            );
          })}
        </div>

        {/* 章节选择 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-ink-500 mb-1">审查章节</label>
          <div className="relative">
            <select
              value={selectedChapterId}
              onChange={e => setSelectedChapterId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-700 bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-sakura-300"
            >
              <option value="">自定义文本</option>
              {project.chapters.map(c => (
                <option key={c.id} value={c.id}>第{c.number}章 {c.title}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          </div>
          {selectedChapterId && selectedChapter && (
            <p className="text-xs text-ink-400 mt-1">{selectedChapter.wordCount.toLocaleString()} 字</p>
          )}
        </div>

        {/* 自定义文本 */}
        {!selectedChapterId && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-ink-500 mb-1">粘贴待审查文本</label>
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              rows={6}
              placeholder="粘贴需要审查的段落……"
              className="w-full px-3 py-2 rounded-lg border border-ink-200 text-xs text-ink-700 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-sakura-300 placeholder-ink-300"
            />
          </div>
        )}

        <button
          onClick={run}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 text-white text-sm rounded-xl disabled:opacity-50 transition-colors ${currentPhase.active}`}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <currentPhase.icon size={15} />}
          {loading ? '审查中…' : '开始审查'}
        </button>

        {/* 推敲说明 */}
        <div className="mt-5 p-3 rounded-xl bg-ink-100 text-xs text-ink-500 leading-relaxed">
          <p className="font-medium text-ink-600 mb-1">推敲建议顺序</p>
          <p>① Phase A：写作前验证情节逻辑（在情节规划页完成）</p>
          <p className="mt-1">② Phase B：写作后整合性审查（口调/词汇/感官）</p>
          <p className="mt-1">③ Phase C：读者视角体验评估</p>
        </div>
      </div>

      {/* 右侧结果 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100">
          <h3 className="text-sm font-medium text-ink-700 flex items-center gap-2">
            <currentPhase.icon size={15} className={currentPhase.color} />
            {currentPhase.label}
          </h3>
          <p className="text-xs text-ink-400 mt-0.5">{currentPhase.desc}</p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full text-ink-400">
              <Loader2 size={32} className="animate-spin mb-3" />
              <p className="text-sm">AI 正在审查中，请稍候…</p>
            </div>
          )}
          {!loading && result && (
            <div className="animate-fade-in">
              <div className="prose prose-sm max-w-none">
                {result.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <h3 key={i} className="text-sm font-semibold text-ink-800 mt-4 mb-1">{line.replace(/\*\*/g, '')}</h3>;
                  }
                  if (line.startsWith('# ')) {
                    return <h2 key={i} className="text-base font-bold text-ink-800 mb-2">{line.slice(2)}</h2>;
                  }
                  if (line.trim() === '') return <div key={i} className="h-2" />;
                  return <p key={i} className="text-sm text-ink-700 leading-relaxed">{line}</p>;
                })}
              </div>
            </div>
          )}
          {!loading && !result && (
            <div className="flex flex-col items-center justify-center h-full text-ink-300">
              <ShieldCheck size={40} className="mb-3 opacity-30" />
              <p className="text-sm">选择审查类型和内容，点击「开始审查」</p>
              <p className="text-xs mt-1">AI 将根据作品设定进行专项检查</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
