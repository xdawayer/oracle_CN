// Quick test script
import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-9071dfaab4224a4eb8f5517df25a1610';

async function testOneBook() {
  console.log('Testing API with one book...');
  
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages: [
        { role: 'system', content: 'You are an expert astrology book analyst.' },
        { role: 'user', content: `Generate a detailed JSON report about the book "占星相位研究" by 苏·汤普金斯. Include sections: context (position_and_influence, author_background, core_contribution), philosophy (underlying_logic, core_concepts, metaphor), structure (logic_flow, modules, key_chapters, knowledge_map), methodology (core_methodology, step_by_step, practical_tools, common_issues), quotes (golden_quotes, core_thought), criticism (limitations, controversies, reading_pitfalls, comparison), action (learning_plan, immediate_action, resources). Output ONLY valid JSON, no markdown. The content should be detailed (at least 5000 Chinese characters).` },
      ],
      temperature: 0.2,
      max_tokens: 12000,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  console.log('Response length:', content.length);
  
  // Save the response
  await fs.writeFile('/tmp/test_report.json', content, 'utf-8');
  console.log('Saved to /tmp/test_report.json');
}

testOneBook().catch(console.error);
