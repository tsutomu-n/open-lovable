export type CloneSiteKind = 'marketing' | 'information-dense';

export interface CloneLink {
  label: string;
  url: string;
  external: boolean;
}

export interface CloneSection {
  title: string;
  summary: string;
  links: CloneLink[];
  contentHints: string[];
}

export interface CloneLinkGroup {
  title: string;
  links: CloneLink[];
}

export interface CloneVisualHints {
  density: 'low' | 'medium' | 'high';
  layout: 'hero-first' | 'portal-grid' | 'multi-column';
  tone: 'light' | 'dark' | 'mixed';
  prominentAnnouncement: boolean;
  navLinkCount: number;
  footerLinkCount: number;
}

export interface CloneBrief {
  siteKind: CloneSiteKind;
  pageTitle: string;
  description: string;
  hero: {
    headline: string;
    subheadline: string;
    cta: CloneLink | null;
  };
  navLinks: CloneLink[];
  sections: CloneSection[];
  footerGroups: CloneLinkGroup[];
  sourceLinks: CloneLink[];
  visualHints: CloneVisualHints;
  rawContentExcerpt: string;
  url: string;
  screenshot: string | null;
  fallbackReason?: string;
}

const SCRAPER_ARTIFACT_PATTERNS = [
  /\*\*Notice:\*\* This page displays a fallback because interactive scripts did not run\.[^\n]*/gi,
  /This page displays a fallback because interactive scripts did not run\.[^\n]*/gi,
];

function sanitizeText(text: string): string {
  let normalized = text
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  for (const pattern of SCRAPER_ARTIFACT_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }

  return normalized
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function stripHtmlTags(text: string): string {
  return sanitizeText(
    text
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
  );
}

function absolutizeUrl(url: string, baseUrl: string): string | null {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
}

function createCloneLink(label: string, url: string, baseUrl: string): CloneLink | null {
  const absoluteUrl = absolutizeUrl(url, baseUrl);
  const normalizedLabel = sanitizeText(label).replace(/\s+/g, ' ').trim();

  if (!absoluteUrl || !normalizedLabel || normalizedLabel.length < 2) {
    return null;
  }

  return {
    label: normalizedLabel.slice(0, 80),
    url: absoluteUrl,
    external: !absoluteUrl.startsWith(baseUrl),
  };
}

function dedupeLinks(links: CloneLink[], limit: number): CloneLink[] {
  const seen = new Set<string>();
  const deduped: CloneLink[] = [];

  for (const link of links) {
    const key = `${link.label}::${link.url}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(link);
    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

function extractLinksFromMarkdown(markdown: string, baseUrl: string): CloneLink[] {
  const links: CloneLink[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(markdown)) !== null) {
    const link = createCloneLink(match[1], match[2], baseUrl);
    if (link) {
      links.push(link);
    }
  }

  return dedupeLinks(links, 40);
}

function extractAnchorsFromHtml(html: string, baseUrl: string): CloneLink[] {
  const links: CloneLink[] = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const label = stripHtmlTags(match[2]);
    const link = createCloneLink(label, match[1], baseUrl);
    if (link) {
      links.push(link);
    }
  }

  return dedupeLinks(links, 60);
}

function extractNavLinksFromHtml(html: string, baseUrl: string, fallbackLinks: CloneLink[]): CloneLink[] {
  const navBlocks = html.match(/<nav\b[\s\S]*?<\/nav>/gi) || [];
  const navLinks = dedupeLinks(
    navBlocks.flatMap(block => extractAnchorsFromHtml(block, baseUrl)),
    8
  );

  if (navLinks.length > 0) {
    return navLinks;
  }

  const headerBlock = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0];
  if (headerBlock) {
    const headerLinks = dedupeLinks(extractAnchorsFromHtml(headerBlock, baseUrl), 8);
    if (headerLinks.length > 0) {
      return headerLinks;
    }
  }

  return fallbackLinks.slice(0, 6);
}

function extractFooterGroupsFromHtml(html: string, baseUrl: string, sourceLinks: CloneLink[]): CloneLinkGroup[] {
  const footerBlock = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0];
  if (!footerBlock) {
    return sourceLinks.length > 0
      ? [{ title: 'Footer', links: sourceLinks.slice(0, 8) }]
      : [];
  }

  const headingRegex = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  const headings = Array.from(footerBlock.matchAll(headingRegex)).map(match => stripHtmlTags(match[1]));
  const footerLinks = dedupeLinks(extractAnchorsFromHtml(footerBlock, baseUrl), 12);

  if (headings.length === 0) {
    return footerLinks.length > 0 ? [{ title: 'Footer', links: footerLinks }] : [];
  }

  return headings.slice(0, 4).map((heading, index) => ({
    title: heading || `Footer ${index + 1}`,
    links: footerLinks.slice(index * 3, index * 3 + 3),
  })).filter(group => group.links.length > 0);
}

function extractSectionsFromMarkdown(markdown: string, baseUrl: string): CloneSection[] {
  const cleanedMarkdown = sanitizeText(markdown);
  const lines = cleanedMarkdown.split('\n');
  const sections: CloneSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  const flushSection = () => {
    if (!currentTitle) {
      return;
    }

    const sectionContent = sanitizeText(currentLines.join('\n'));
    const sectionLinks = extractLinksFromMarkdown(sectionContent, baseUrl).slice(0, 4);
    const contentHints = sectionContent
      .split('\n')
      .map(line => sanitizeText(line.replace(/^[-*>\d. ]+/, '')))
      .filter(line => line.length > 24 && !line.startsWith('['))
      .slice(0, 4);

    sections.push({
      title: currentTitle,
      summary: contentHints[0] || sectionContent.slice(0, 220),
      links: sectionLinks,
      contentHints,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);

    if (headingMatch) {
      flushSection();
      currentTitle = sanitizeText(headingMatch[1]);
      currentLines = [];
      continue;
    }

    if (!currentTitle && line.length > 0) {
      currentLines.push(line);
      continue;
    }

    currentLines.push(line);
  }

  flushSection();

  if (sections.length === 0 && cleanedMarkdown) {
    return [{
      title: 'Overview',
      summary: cleanedMarkdown.slice(0, 220),
      links: extractLinksFromMarkdown(cleanedMarkdown, baseUrl).slice(0, 4),
      contentHints: cleanedMarkdown
        .split('\n')
        .map(line => sanitizeText(line))
        .filter(line => line.length > 24)
        .slice(0, 4),
    }];
  }

  return sections.slice(0, 12);
}

function extractHero(markdown: string, sections: CloneSection[], sourceLinks: CloneLink[]): CloneBrief['hero'] {
  const firstSection = sections[0];
  const firstHeadingMatch = sanitizeText(markdown).match(/^#{1,2}\s+(.+)$/m);
  const headline = firstSection?.title || sanitizeText(firstHeadingMatch?.[1] || '') || 'Welcome';
  const subheadline = firstSection?.summary || sanitizeText(markdown.split('\n').find(line => line.trim().length > 40) || '');
  const cta = firstSection?.links[0] || sourceLinks[0] || null;

  return {
    headline,
    subheadline: subheadline.slice(0, 240),
    cta,
  };
}

function detectSiteKind(sections: CloneSection[], links: CloneLink[], contentLength: number): CloneSiteKind {
  if (sections.length >= 5 || links.length >= 12 || contentLength >= 2200) {
    return 'information-dense';
  }

  return 'marketing';
}

function buildVisualHints(
  html: string,
  siteKind: CloneSiteKind,
  navLinks: CloneLink[],
  footerGroups: CloneLinkGroup[],
  sections: CloneSection[]
): CloneVisualHints {
  const normalizedHtml = html.toLowerCase();
  const density = siteKind === 'information-dense'
    ? 'high'
    : sections.length >= 3
      ? 'medium'
      : 'low';

  const layout = siteKind === 'information-dense'
    ? 'portal-grid'
    : sections.length >= 4
      ? 'multi-column'
      : 'hero-first';

  const tone = normalizedHtml.includes('dark') || normalizedHtml.includes('#111')
    ? 'dark'
    : normalizedHtml.includes('linear-gradient') || normalizedHtml.includes('gradient')
      ? 'mixed'
      : 'light';

  return {
    density,
    layout,
    tone,
    prominentAnnouncement: /notice|register|announcement|breaking/i.test(normalizedHtml),
    navLinkCount: navLinks.length,
    footerLinkCount: footerGroups.reduce((total, group) => total + group.links.length, 0),
  };
}

export function buildCloneBrief(input: {
  url: string;
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown>;
  screenshot?: string | null;
  fallbackReason?: string;
}): CloneBrief {
  const cleanedMarkdown = sanitizeText(input.markdown || '');
  const html = input.html || '';
  const sourceLinks = dedupeLinks([
    ...extractLinksFromMarkdown(cleanedMarkdown, input.url),
    ...extractAnchorsFromHtml(html, input.url),
  ], 40);
  const sections = extractSectionsFromMarkdown(cleanedMarkdown, input.url);
  const navLinks = extractNavLinksFromHtml(html, input.url, sourceLinks);
  const footerGroups = extractFooterGroupsFromHtml(html, input.url, sourceLinks);
  const siteKind = detectSiteKind(sections, sourceLinks, cleanedMarkdown.length);
  const metadataTitle = typeof input.metadata?.title === 'string' ? input.metadata.title : '';
  const metadataDescription = typeof input.metadata?.description === 'string' ? input.metadata.description : '';

  return {
    siteKind,
    pageTitle: sanitizeText(metadataTitle) || sections[0]?.title || 'Untitled site',
    description: sanitizeText(metadataDescription),
    hero: extractHero(cleanedMarkdown, sections, sourceLinks),
    navLinks,
    sections,
    footerGroups,
    sourceLinks,
    visualHints: buildVisualHints(html, siteKind, navLinks, footerGroups, sections),
    rawContentExcerpt: cleanedMarkdown.slice(0, 4000),
    url: input.url,
    screenshot: input.screenshot || null,
    fallbackReason: input.fallbackReason,
  };
}

function formatLinks(label: string, links: CloneLink[]): string {
  if (links.length === 0) {
    return `${label}: none`;
  }

  return `${label}:\n${links.map(link => `- ${link.label} -> ${link.url}`).join('\n')}`;
}

export function formatCloneBriefForPrompt(brief: CloneBrief): string {
  const sectionLines = brief.sections.map((section, index) => [
    `${index + 1}. ${section.title}`,
    `   summary: ${section.summary || 'n/a'}`,
    `   links: ${section.links.map(link => `${link.label} -> ${link.url}`).join(' | ') || 'none'}`,
    `   hints: ${section.contentHints.join(' | ') || 'none'}`,
  ].join('\n')).join('\n');

  const footerLines = brief.footerGroups.map(group => [
    `- ${group.title}`,
    ...group.links.map(link => `  - ${link.label} -> ${link.url}`),
  ].join('\n')).join('\n');

  return [
    `siteKind: ${brief.siteKind}`,
    `pageTitle: ${brief.pageTitle}`,
    `description: ${brief.description || 'n/a'}`,
    `visualHints: density=${brief.visualHints.density}, layout=${brief.visualHints.layout}, tone=${brief.visualHints.tone}, announcement=${brief.visualHints.prominentAnnouncement}`,
    `hero.headline: ${brief.hero.headline || 'n/a'}`,
    `hero.subheadline: ${brief.hero.subheadline || 'n/a'}`,
    `hero.cta: ${brief.hero.cta ? `${brief.hero.cta.label} -> ${brief.hero.cta.url}` : 'none'}`,
    formatLinks('navLinks', brief.navLinks),
    `sections:\n${sectionLines || 'none'}`,
    `footerGroups:\n${footerLines || 'none'}`,
    formatLinks('sourceLinks', brief.sourceLinks.slice(0, 16)),
    `rawContentExcerpt:\n${brief.rawContentExcerpt || 'n/a'}`,
  ].join('\n\n');
}
