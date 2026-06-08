import { Project } from './types';

const PROJECTS_KEY = 'ln_studio_projects';
const ACTIVE_KEY = 'ln_studio_active';

export const storage = {
  getAll(): Project[] {
    try {
      return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    } catch { return []; }
  },

  save(project: Project): void {
    const all = this.getAll();
    const idx = all.findIndex(p => p.id === project.id);
    project.updatedAt = new Date().toISOString();
    if (idx >= 0) all[idx] = project;
    else all.unshift(project);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
  },

  delete(id: string): void {
    const all = this.getAll().filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
    if (this.getActiveId() === id) localStorage.removeItem(ACTIVE_KEY);
  },

  getActiveId(): string | null {
    return localStorage.getItem(ACTIVE_KEY);
  },

  setActiveId(id: string | null): void {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  }
};

export function newProject(): Project {
  return {
    id: crypto.randomUUID(),
    title: '新建作品',
    genre: '轻小说',
    lang: 'zh' as import('./types').Lang,
    theme: '',
    summary: '',
    emotionCurve: '',
    targetLength: '100000',
    world: { overview: '', geography: '', organizations: '', magicSystem: '', constraints: '', era: '', notes: '' },
    characters: [],
    chapters: [],
    foreshadowing: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function newCharacter(): import('./types').Character {
  return {
    id: crypto.randomUUID(),
    name: '新角色',
    role: '配角',
    age: '', gender: '', height: '', build: '', affiliation: '',
    hairStyle: '', hairColor: '', eyeColor: '', eyeShape: '', skin: '', outfit: '', accessories: '',
    personalityKeywords: '', publicFace: '', privateFace: '', strengths: '', weaknesses: '', speech: '',
    trauma: '', motivation: '', goal: '', arc: '',
    habits: '', likes: '', dislikes: '',
    relations: [], versions: [], notes: '',
    createdAt: new Date().toISOString()
  };
}

export function newChapter(number: number): import('./types').Chapter {
  return {
    id: crypto.randomUUID(),
    number,
    title: `第${number}章`,
    summary: '', scenes: [], content: '', wordCount: 0,
    createdAt: new Date().toISOString()
  };
}

export function newScene(): import('./types').Scene {
  return {
    id: crypto.randomUUID(),
    title: '新场景',
    location: '', time: '', pov: '', characters: '',
    events: '', emotion: '', keyDialogue: '', foreshadowing: ''
  };
}
