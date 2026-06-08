export type View = 'workshop' | 'world' | 'characters' | 'plot' | 'write' | 'revise';
export type Lang = 'zh' | 'ja';

export interface CharacterRelation {
  name: string;
  type: string;
  feeling: string;
}

export interface CharacterVersion {
  id: string;
  label: string; // e.g. "第1-3章", "觉醒后"
  appearance: string;
  personality: string;
  speech: string;
}

export interface Character {
  id: string;
  name: string;
  role: '主角' | '女主' | '反派' | '配角' | '其他';
  age: string;
  gender: string;
  height: string;
  build: string;
  affiliation: string;
  // 外貌
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  eyeShape: string;
  skin: string;
  outfit: string;
  accessories: string;
  // 性格
  personalityKeywords: string;
  publicFace: string;
  privateFace: string;
  strengths: string;
  weaknesses: string;
  speech: string; // 口调/一人称
  // 内心
  trauma: string;
  motivation: string;
  goal: string;
  arc: string;
  // 癖好
  habits: string;
  likes: string;
  dislikes: string;
  // 关系
  relations: CharacterRelation[];
  // 章节版本（人物成长/黑化等）
  versions: CharacterVersion[];
  notes: string;
  createdAt: string;
}

export interface Scene {
  id: string;
  title: string;
  location: string;
  time: string;
  pov: string;
  characters: string;
  events: string;
  emotion: string;
  keyDialogue: string;
  foreshadowing: string;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  scenes: Scene[];
  content: string;
  wordCount: number;
  createdAt: string;
}

export interface WorldBuilding {
  overview: string;
  geography: string;
  organizations: string;
  magicSystem: string;
  constraints: string; // 世界制约：不存在的词汇/概念
  era: string;
  notes: string;
}

export interface Project {
  id: string;
  title: string;
  genre: string;
  lang: Lang;        // 写作语言：zh 中文 | ja 日文
  theme: string;
  summary: string;
  emotionCurve: string;
  targetLength: string;
  world: WorldBuilding;
  characters: Character[];
  chapters: Chapter[];
  foreshadowing: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}
