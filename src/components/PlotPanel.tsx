import React, { useState } from 'react';
import { Chapter, Scene, Project } from '../types';
import { newChapter, newScene } from '../storage';
import { Plus, Trash2, BookOpen, Map, ChevronDown, ChevronRight } from 'lucide-react';

interface Props { project: Project; onChange: (p: Project) => void; }

function Field({ label, value, onChange, placeholder, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-ink-500 mb-1">{label}</label>
      {rows === 1 ? (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-3 py-1.5 rounded-lg border border-ink-200 text-sm text-ink-800 bg-white focus:outline-none focus:ring-1 focus:ring-sakura-300 placeholder-ink-300" />
      ) : (
        <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-3 py-1.5 rounded-lg border border-ink-200 text-sm text-ink-800 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-sakura-300 placeholder-ink-300" />
      )}
    </div>
  );
}

export default function PlotPanel({ project, onChange }: Props) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(project.chapters[0]?.id ?? null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const selectedChapter = project.chapters.find(c => c.id === selectedChapterId);
  const selectedScene = selectedChapter?.scenes.find(s => s.id === selectedSceneId);

  const addChapter = () => {
    const ch = newChapter(project.chapters.length + 1);
    onChange({ ...project, chapters: [...project.chapters, ch] });
    setSelectedChapterId(ch.id);
  };

  const deleteChapter = (id: string) => {
    const chapters = project.chapters.filter(c => c.id !== id).map((c, i) => ({ ...c, number: i + 1 }));
    onChange({ ...project, chapters });
    setSelectedChapterId(chapters[0]?.id ?? null);
    setSelectedSceneId(null);
  };

  const updateChapter = (patch: Partial<Chapter>) => {
    if (!selectedChapter) return;
    const chapters = project.chapters.map(c => c.id === selectedChapter.id ? { ...c, ...patch } : c);
    onChange({ ...project, chapters });
  };

  const addScene = () => {
    if (!selectedChapter) return;
    const s = newScene();
    updateChapter({ scenes: [...selectedChapter.scenes, s] });
    setSelectedSceneId(s.id);
  };

  const deleteScene = (id: string) => {
    if (!selectedChapter) return;
    updateChapter({ scenes: selectedChapter.scenes.filter(s => s.id !== id) });
    setSelectedSceneId(null);
  };

  const updateScene = (patch: Partial<Scene>) => {
    if (!selectedChapter || !selectedScene) return;
    const scenes = selectedChapter.scenes.map(s => s.id === selectedScene.id ? { ...s, ...patch } : s);
    updateChapter({ scenes });
  };

  const toggleChapter = (id: string) => {
    const next = new Set(expandedChapters);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedChapters(next);
  };

  return (
    <div className="flex h-full">
      {/* 章节/场景树 */}
      <div className="w-52 flex-shrink-0 border-r border-ink-200 bg-ink-50 flex flex-col">
        <div className="p-3 border-b border-ink-200 flex items-center justify-between">
          <span className="text-xs text-ink-400 font-medium flex items-center gap-1"><BookOpen size={12}/>章节结构</span>
          <button onClick={addChapter} className="p-1 rounded-lg hover:bg-sakura-100 text-sakura-500 transition-colors"><Plus size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {project.chapters.length === 0 && <p className="text-xs text-ink-300 text-center mt-6">点击 + 新建章节</p>}
          {project.chapters.map(ch => (
            <div key={ch.id}>
              <div
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer mb-0.5 group ${
                  selectedChapterId === ch.id && !selectedSceneId ? 'bg-sakura-100 text-sakura-700' : 'hover:bg-ink-100 text-ink-700'
                }`}
                onClick={() => { setSelectedChapterId(ch.id); setSelectedSceneId(null); toggleChapter(ch.id); }}
              >
                <span className="text-ink-400" onClick={e => { e.stopPropagation(); toggleChapter(ch.id); }}>
                  {expandedChapters.has(ch.id) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                </span>
                <BookOpen size={12} className="flex-shrink-0" />
                <span className="text-xs flex-1 truncate">第{ch.number}章 {ch.title}</span>
              </div>
              {expandedChapters.has(ch.id) && ch.scenes.map(s => (
                <div
                  key={s.id}
                  onClick={() => { setSelectedChapterId(ch.id); setSelectedSceneId(s.id); }}
                  className={`ml-5 flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer mb-0.5 text-xs ${
                    selectedSceneId === s.id ? 'bg-mist-100 text-mist-700' : 'hover:bg-ink-100 text-ink-500'
                  }`}
                >
                  <Map size={11} />
                  <span className="truncate">{s.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 伏线总表 */}
        <div className="p-3 border-t border-ink-200">
          <p className="text-xs font-medium text-ink-400 mb-1">伏线总表</p>
          <textarea
            value={project.foreshadowing}
            onChange={e => onChange({ ...project, foreshadowing: e.target.value })}
            rows={4}
            placeholder={"伏线1：第1章埋→第3章回收\n伏线2："}
            className="w-full px-2 py-1.5 rounded-lg border border-ink-200 text-xs text-ink-700 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-sakura-300 placeholder-ink-300"
          />
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedScene && selectedChapter ? (
          /* 场景编辑 */
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-ink-800 flex items-center gap-2">
                <Map size={16} className="text-mist-500" />
                场景详情
              </h2>
              <button onClick={() => deleteScene(selectedScene.id)} className="text-ink-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
            </div>
            <Field label="场景标题" value={selectedScene.title} onChange={v => updateScene({ title: v })} rows={1} placeholder="场景名称" />
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="地点" value={selectedScene.location} onChange={v => updateScene({ location: v })} rows={1} placeholder="图书馆二楼密室" />
              <Field label="时间" value={selectedScene.time} onChange={v => updateScene({ time: v })} rows={1} placeholder="深夜/初秋/月圆之夜" />
              <Field label="视角" value={selectedScene.pov} onChange={v => updateScene({ pov: v })} rows={1} placeholder="主角视角/全知视角" />
              <Field label="出场人物" value={selectedScene.characters} onChange={v => updateScene({ characters: v })} rows={1} placeholder="主角、洛晴、路人甲" />
            </div>
            <Field label="发生事件" value={selectedScene.events} onChange={v => updateScene({ events: v })} rows={4} placeholder="具体发生了什么？3-5行描述……" />
            <Field label="情感高潮" value={selectedScene.emotion} onChange={v => updateScene({ emotion: v })} rows={2} placeholder="这个场景的情感顶点在哪里？读者应感到……" />
            <Field label="关键台词" value={selectedScene.keyDialogue} onChange={v => updateScene({ keyDialogue: v })} rows={2} placeholder="「你早就知道了，是吗。」" />
            <Field label="伏线（埋/回收）" value={selectedScene.foreshadowing} onChange={v => updateScene({ foreshadowing: v })} rows={2} placeholder="埋：窗边的旧照片→第5章回收\n回收：第2章的预言" />
          </div>
        ) : selectedChapter ? (
          /* 章节编辑 */
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-ink-800 flex items-center gap-2">
                <BookOpen size={16} className="text-sakura-500" />
                第{selectedChapter.number}章
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={addScene}
                  className="flex items-center gap-1 text-xs text-mist-600 hover:text-mist-700 border border-mist-200 rounded-lg px-2 py-1"
                ><Plus size={12}/>新建场景</button>
                <button onClick={() => deleteChapter(selectedChapter.id)} className="text-ink-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
            <Field label="章节标题" value={selectedChapter.title} onChange={v => updateChapter({ title: v })} rows={1} placeholder="第一章的标题" />
            <Field label="章节概要" value={selectedChapter.summary} onChange={v => updateChapter({ summary: v })} rows={5} placeholder="这一章发生了什么？关键转折、角色状态变化……" />
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-ink-600">场景列表 ({selectedChapter.scenes.length})</p>
                <button onClick={addScene} className="flex items-center gap-1 text-xs text-sakura-500 hover:text-sakura-600">
                  <Plus size={12}/>添加场景
                </button>
              </div>
              {selectedChapter.scenes.length === 0 ? (
                <p className="text-sm text-ink-300 text-center py-8 border border-dashed border-ink-200 rounded-xl">点击「添加场景」规划本章场景</p>
              ) : (
                <div className="space-y-2">
                  {selectedChapter.scenes.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSceneId(s.id)}
                      className="p-3 rounded-xl border border-ink-200 hover:border-mist-300 cursor-pointer bg-white transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink-700">{s.title}</span>
                        <ChevronRight size={14} className="text-ink-300" />
                      </div>
                      {s.location && <p className="text-xs text-ink-400 mt-0.5">{s.location} · {s.time}</p>}
                      {s.events && <p className="text-xs text-ink-500 mt-1 line-clamp-1">{s.events}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ink-300">
            <div className="text-center">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">从左侧选择章节，或点击 + 新建</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
