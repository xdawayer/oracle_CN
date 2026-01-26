const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'test';
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

async function callDeepSeekAPI(prompt) {
  console.log('Calling DeepSeek API...');
  const response = await fetch(BASE_URL + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a JSON expert. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);
    throw new Error('API Error');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned');
  }

  console.log('Response length:', content.length);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    console.log('No JSON found');
    return {};
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateContent(item) {
  const zhPrompt = 'Generate deep dive content for ' + item.title + ' (Chinese). Include: 1. Astronomy & Myth 2. Jungian Psychology 3. Shadow Traits 4. Integration Advice';
  const enPrompt = 'Generate deep dive content for ' + item.title + ' (English). Include: 1. Astronomy & Myth 2. Jungian Psychology 3. Shadow Traits 4. Integration Advice';
  const lang = process.argv[3] || 'zh';
  const prompt = lang === 'zh' ? zhPrompt : enPrompt;
  return await callDeepSeekAPI(prompt);
}

const category = process.argv[2];
const itemId = process.argv[4];
const lang = process.argv[3] || 'zh';

console.log('Category:', category, 'Language:', lang, 'Item ID:', itemId);

const wiki = require('../src/data/wiki.js');
const itemsZh = wiki.WIKI_ITEMS_ZH || [];
const itemsEn = wiki.WIKI_ITEMS_EN || [];

let items;
if (category === 'planets') {
  const planetIds = itemId ? [itemId] : ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'uranus', 'neptune', 'pluto'];
  items = itemsZh.filter(item => planetIds.includes(item.id));
} else if (category === 'signs') {
  const signIds = itemId ? [itemId] : ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  items = itemsZh.filter(item => signIds.includes(item.id));
} else if (category === 'houses') {
  const houseIds = itemId ? [itemId] : Array.from({ length: 12 }, (_, i) => 'house-' + (i + 1));
  items = itemsZh.filter(item => houseIds.includes(item.id));
} else if (category === 'aspects') {
  const aspectIds = itemId ? [itemId] : ['conjunction', 'opposition', 'square', 'trine', 'sextile'];
  items = itemsZh.filter(item => aspectIds.includes(item.id));
} else {
  console.error('Invalid category:', category);
  process.exit(1);
}

if (items.length === 0) {
  console.error('No items found for category:', category);
  process.exit(1);
}

async function main() {
  for (const item of items) {
    try {
      const result = await generateContent(item);
      console.log('Generated:', item.title);
    } catch (error) {
      console.error('Failed:', item.title, error.message);
    }
  }
}

main();
