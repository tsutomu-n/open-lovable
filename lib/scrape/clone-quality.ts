import type { CloneBrief } from './clone-brief';

export interface GeneratedCloneFile {
  path: string;
  content: string;
}

export interface CloneFidelityAssessment {
  issues: string[];
  targetFiles: string[];
  correctionPrompt: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function includesNormalized(haystack: string, needle: string): boolean {
  if (!needle.trim()) {
    return false;
  }

  return normalize(haystack).includes(normalize(needle));
}

function findFile(files: GeneratedCloneFile[], pattern: RegExp): GeneratedCloneFile | undefined {
  return files.find(file => pattern.test(file.path));
}

function collectIssues(brief: CloneBrief, files: GeneratedCloneFile[]): string[] {
  const issues: string[] = [];
  const combinedContent = files.map(file => file.content).join('\n');
  const hasPlaceholderLinks = /href=["']#["']/.test(combinedContent);

  if (hasPlaceholderLinks && brief.sourceLinks.length > 0) {
    issues.push('Replace placeholder links with real source URLs when available.');
  }

  if (brief.hero.headline && !includesNormalized(combinedContent, brief.hero.headline)) {
    issues.push(`Restore the hero headline "${brief.hero.headline}".`);
  }

  if (brief.hero.cta?.label && !includesNormalized(combinedContent, brief.hero.cta.label)) {
    issues.push(`Include the primary CTA label "${brief.hero.cta.label}" and keep its real URL.`);
  }

  const missingSectionTitles = brief.sections
    .map(section => section.title)
    .filter(title => title && !includesNormalized(combinedContent, title));

  if (brief.siteKind === 'information-dense' && missingSectionTitles.length >= 2) {
    issues.push(`Restore the missing information-dense sections: ${missingSectionTitles.slice(0, 4).join(', ')}.`);
  }

  const footerFile = findFile(files, /Footer\.(jsx|tsx?)$/i);
  if (brief.footerGroups.length > 0 && !footerFile) {
    issues.push('Add a footer that preserves the source footer link groups.');
  } else if (footerFile) {
    const missingFooterLinks = brief.footerGroups
      .flatMap(group => group.links)
      .map(link => link.label)
      .filter(label => label && !includesNormalized(footerFile.content, label));

    if (missingFooterLinks.length >= 2) {
      issues.push(`Restore the footer link groups with labels such as ${missingFooterLinks.slice(0, 4).join(', ')}.`);
    }
  }

  const navFile = findFile(files, /(Header|Nav)\.(jsx|tsx?)$/i);
  if (brief.navLinks.length >= 4 && navFile) {
    const matchedNavLinks = brief.navLinks.filter(link => includesNormalized(navFile.content, link.label));
    if (matchedNavLinks.length < Math.min(3, brief.navLinks.length)) {
      issues.push('Preserve more of the original navigation labels in the header/navigation component.');
    }
  }

  if (brief.siteKind === 'information-dense' && files.length < 5) {
    issues.push('Do not over-compress information-dense sites into too few files or sections.');
  }

  return issues;
}

function suggestTargetFiles(brief: CloneBrief, files: GeneratedCloneFile[]): string[] {
  const targets = new Set<string>();
  const availablePaths = files.map(file => file.path);

  const addIfPresent = (pattern: RegExp) => {
    const file = findFile(files, pattern);
    if (file) {
      targets.add(file.path);
    }
  };

  addIfPresent(/Header\.(jsx|tsx?)$/i);
  addIfPresent(/Nav\.(jsx|tsx?)$/i);
  addIfPresent(/Hero\.(jsx|tsx?)$/i);
  addIfPresent(/Footer\.(jsx|tsx?)$/i);
  addIfPresent(/ContentSections\.(jsx|tsx?)$/i);
  addIfPresent(/Features\.(jsx|tsx?)$/i);
  addIfPresent(/Sections\.(jsx|tsx?)$/i);

  if (targets.size === 0 && availablePaths.length > 0) {
    targets.add(availablePaths[0]);
  }

  if (brief.siteKind === 'information-dense' && targets.size < 3) {
    availablePaths.slice(0, 3).forEach(path => targets.add(path));
  }

  return Array.from(targets).slice(0, 4);
}

export function assessCloneFidelity(
  brief: CloneBrief,
  files: GeneratedCloneFile[]
): CloneFidelityAssessment {
  const issues = collectIssues(brief, files);
  const targetFiles = issues.length > 0 ? suggestTargetFiles(brief, files) : [];
  const correctionPrompt = issues.length > 0
    ? [
        'Improve clone fidelity using the source-of-truth clone brief.',
        ...issues.map(issue => `- ${issue}`),
      ].join('\n')
    : '';

  return {
    issues,
    targetFiles,
    correctionPrompt,
  };
}
