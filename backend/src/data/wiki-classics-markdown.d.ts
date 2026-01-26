export interface WikiClassicMarkdownItem {
  id: string;
  title: string;
  author: string;
  summary: string;
  cover_url: string | null;
  keywords: string[];
  category?: string;
  content: string;
}

export const WIKI_CLASSICS_MARKDOWN_ZH: WikiClassicMarkdownItem[];
export const WIKI_CLASSICS_MARKDOWN_EN: WikiClassicMarkdownItem[];

export function getWikiClassics(lang: 'zh' | 'en'): WikiClassicMarkdownItem[];
export function getWikiClassicDetail(id: string, lang: 'zh' | 'en'): WikiClassicMarkdownItem | null;

declare const _default: {
  WIKI_CLASSICS_MARKDOWN_ZH: WikiClassicMarkdownItem[];
  WIKI_CLASSICS_MARKDOWN_EN: WikiClassicMarkdownItem[];
  getWikiClassics: typeof getWikiClassics;
  getWikiClassicDetail: typeof getWikiClassicDetail;
};

export default _default;
