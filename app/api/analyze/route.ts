// app/api/analyze/route.ts
import { insertKeyword } from "@/lib/insertKeywords";

interface TwinwordResponse {
  keyword: Record<string, number>;
  topic: Record<string, number>;
  result_code: string;
  result_msg: string;
}

function calculateScore(keywords: Record<string, number>, topics: Record<string, number>, text: string): number {
  const keywordCount = Object.keys(keywords).length;
  const topicScores = Object.values(topics);
  const maxTopicScore = Math.max(...topicScores, 0);
  const textLength = text.trim().length;
  const wordCount = text.trim().split(/\s+/).length;

  // Return 0 for very short or empty content
  if (textLength < 20 || keywordCount === 0 || wordCount < 5) return 0;

  // Calculate keyword density (keywords per 100 words, not characters)
  const keywordDensity = Math.min((keywordCount / wordCount) * 100, 20); // Cap at 20 to prevent over-optimization
  
  // Normalize topic relevance score (0-1 range to 0-100 range)
  const topicRelevance = maxTopicScore * 100;
  
  // Calculate base score with weighted components
  let score = (keywordDensity * 2) + (topicRelevance * 0.8);
  
  // Apply content length factor
  let lengthFactor = 1;
  if (textLength < 100) lengthFactor = 0.6;
  else if (textLength < 200) lengthFactor = 0.8;
  else if (textLength < 500) lengthFactor = 0.9;
  
  // Apply keyword count factor
  let keywordFactor = 1;
  if (keywordCount < 3) keywordFactor = 0.7;
  else if (keywordCount < 5) keywordFactor = 0.85;
  
  // Apply diversity factor based on topic score distribution
  let diversityFactor = 1;
  if (topicScores.length > 1) {
    const sortedScores = topicScores.sort((a, b) => b - a);
    const topTwo = sortedScores.slice(0, 2);
    if (topTwo.length > 1 && topTwo[1] > topTwo[0] * 0.7) {
      diversityFactor = 1.1; // Bonus for topic diversity
    }
  }
  
  // Calculate final score
  score = score * lengthFactor * keywordFactor * diversityFactor;
  
  // Ensure realistic scoring ranges
  if (score > 85) score = 85 + (score - 85) * 0.3; // Diminishing returns for very high scores
  
  return Math.min(100, Math.max(0, Math.round(score)));
}

function isMeaningfulContent(text: string, keywords: Record<string, number>): boolean {
  const lowerText = text.toLowerCase();
  const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);

  // Check for placeholder content
  if (lowerText.includes('lorem ipsum') || 
      lowerText.includes('sample text') || 
      lowerText.includes('placeholder')) return false;
  
  // Check minimum length
  if (text.trim().length < 10) return false;

  // Check for meaningful keywords
  const meaningfulKeywords = Object.keys(keywords).filter(kw => 
    kw.length > 2 && 
    !commonWords.has(kw.toLowerCase()) &&
    !(/^\d+$/.test(kw)) // Exclude pure numbers
  );
  
  // Check for repetitive content
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = uniqueWords.size / words.length;
  
  if (repetitionRatio < 0.5 && words.length > 10) return false; // Too repetitive

  return meaningfulKeywords.length > 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, insertKeyword: keywordToInsert } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "Please enter valid text." }, { status: 400 });
    }

    const trimmedText = text.trim();

    if (keywordToInsert) {
      try {
        const updatedText = insertKeyword(trimmedText, keywordToInsert);
        return Response.json({ updatedText });
      } catch (err) {
        console.error("Keyword insert error:", err);
        return Response.json({ error: "Keyword insertion failed." }, { status: 500 });
      }
    }

    const apiKey = process.env.TWINWORD_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Missing Twinword API key." }, { status: 500 });
    }

    const form = new URLSearchParams({ text: trimmedText });
    const twinRes = await fetch("https://api.twinword.com/api/v7/topic/generate/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Twaip-Key": apiKey
      },
      body: form
    });

    const data = await twinRes.json() as TwinwordResponse;
    console.log("Twinword API Response:", data);

    if (data.result_code !== "200") {
      return Response.json({ error: "Topic not found or irrelevant." }, { status: 500 });
    }

    const keywords = data.keyword || {};
    const topics = data.topic || {};

    if (!isMeaningfulContent(trimmedText, keywords)) {
      return Response.json({
        keywords: [],
        score: 0,
        scoreCategory: "low",
        topic: "No meaningful content",
        message: "Text seems to be placeholder or lacks SEO value."
      });
    }

    const keywordArray = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    const sortedTopics = Object.entries(topics).sort((a, b) => b[1] - a[1]);
    const topTopic = sortedTopics.length > 0 ? sortedTopics[0][0] : "general";

    const score = calculateScore(keywords, topics, trimmedText);
    
    // More realistic score categorization
    let scoreCategory: string;
    if (score >= 75) scoreCategory = "high";
    else if (score >= 50) scoreCategory = "medium";
    else if (score >= 25) scoreCategory = "low";
    else scoreCategory = "very-low";

    return Response.json({
      keywords: keywordArray,
      score,
      scoreCategory,
      topic: topTopic,
      topicScore: sortedTopics[0]?.[1] || 0,
      totalKeywords: keywordArray.length,
      textLength: trimmedText.length,
      wordCount: trimmedText.split(/\s+/).length
    });
  } catch (err) {
    console.error("API Error:", err);
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}