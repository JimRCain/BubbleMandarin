import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vocabularyDir = join(__dirname, '..', 'src', 'data', 'vocabulary');

const files = [
  'HSK 1.json',
  'HSK 2.json',
  'HSK 3.json',
  'HSK 4.json',
  'HSK 5.json',
];

for (const file of files) {
  const filePath = join(vocabularyDir, file);
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  let changed = false;
  const updated = data.map((word) => {
    if (word.difficulty !== 'simple') {
      changed = true;
      return { ...word, difficulty: 'simple' };
    }
    return word;
  });
  if (changed) {
    writeFileSync(filePath, JSON.stringify(updated, null, 2));
    console.log(`✅ Updated difficulties to 'simple' in ${file}`);
  } else {
    console.log(`⏭️  No changes needed in ${file}`);
  }
}