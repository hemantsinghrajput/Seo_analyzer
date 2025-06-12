export function insertKeyword(text: string, keyword: string): string {
    // Simple strategy: insert keyword into the first paragraph if not already present
    if (text.includes(keyword)) return text;
  
    const sentences = text.split('.');
    if (sentences.length === 0) return `${keyword}. ${text}`;
  
    // Insert after first sentence
    sentences[0] += ` ${keyword}`;
    return sentences.join('.');
  }