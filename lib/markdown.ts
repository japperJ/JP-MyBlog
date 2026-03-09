// github-slugger is the same library rehype-slug uses internally.
// Using it here guarantees ID parity between extractHeadings() output
// and the id attributes rehype-slug adds to rendered heading elements.
import GithubSlugger from 'github-slugger';

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
}

export function extractHeadings(content: string): Array<{ level: number; text: string; id: string }> {
  const slugger = new GithubSlugger();
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; id: string }> = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2],
      id: slugger.slug(match[2]),
    });
  }

  return headings;
}
