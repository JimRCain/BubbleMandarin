import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'src', 'data', 'vocabulary', 'HSK 5.json');

// Official HSK 5 dataset from the Chinese-learning-tools GitHub repo
const URL = 'https://raw.githubusercontent.com/chinese-learning-tools/hsk/master/HSK5.txt';

async function main() {
  try {
    const resp = await fetch(URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();

    const lines = text.trim().split('\n');
    const entries = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) continue; // skip malformed

      const hanzi = parts[0];
      const pinyin = parts[1];
      const english = parts.slice(2).join(' '); // english may contain spaces

      // Determine difficulty based on common sense grouping
      let difficulty = 'medium';
      // simple: common everyday words; hard: more academic/abstract
      const simpleKeywords = ['人','大','小','好','吃','喝','看','听','说','去','来','有','是'];
      const isSimple = simpleKeywords.some(k => hanzi.includes(k));
      if (isSimple) difficulty = 'simple';
      else if (hanzi.length >= 3) difficulty = 'hard'; // longer hanzi often harder

      entries.push({
        english: english,
        hanzi: hanzi,
        pinyin: pinyin,
        difficulty: difficulty,
        category: 'HSK 5'
      });
    }

    writeFileSync(outputPath, JSON.stringify(entries, null, 2));
    console.log(`✅ Generated HSK 5 vocabulary: ${entries.length} words written`);
  } catch (err) {
    console.error(`❌ Failed to generate HSK 5 vocabulary: ${err.message}`);
    console.log('Creating a fallback minimal file to prevent build errors.');
    writeFileSync(outputPath, JSON.stringify([
      {"english":"airport","hanzi":"机场","pinyin":"jī chǎng","difficulty":"simple","category":"HSK 5"},
      {"english":"environment","hanzi":"环境","pinyin":"huán jìng","difficulty":"simple","category":"HSK 5"},
      {"english":"education","hanzi":"教育","pinyin":"jiào yù","difficulty":"simple","category":"HSK 5"},
      {"english":"experience","hanzi":"经验","pinyin":"jīng yàn","difficulty":"simple","category":"HSK 5"},
      {"english":"government","hanzi":"政府","pinyin":"zhèng fǔ","difficulty":"simple","category":"HSK 5"}
    ], null, 2));
  }
}

main();