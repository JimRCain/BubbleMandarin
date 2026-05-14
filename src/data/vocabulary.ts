// Normalize a filename (without extension) to the category name used in the menu.
function normalizeCategory(name: string): string {
  // Specific overrides for tricky names
  const overrides: Record<string, string> = {
    "Numbers (1-20)": "Numbers (1‑20)",
    "Animals (pets)": "Animals (pets)",
    "Animals (farm)": "Animals (farm)",
    "Animals (wild basic)": "Animals (wild basic)",
    "Family (immediate)": "Family (immediate)",
    "Food (snacks meals)": "Food (snacks/meals)",
    "Body actions (run, jump, sit, clap, etc.)": "Movement verbs",
    "Occupations (basic)": "Occupations (basic)",
    "Greetings-polite-phrases": "Greetings & polite phrases",
    "Size-shape": "Size & shape",
    "Days of week": "Days of week",
    "Months-seasons": "Months / seasons",
    "House-rooms": "House / rooms",
  };
  if (overrides[name]) return overrides[name];
  // Default: replace hyphens with spaces, capitalize words
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

interface WordData {
  english: string;
  hanzi: string;
  pinyin: string;
  difficulty: string;
  category: string;
}

const modules = import.meta.glob('./vocabulary/*.json', { eager: true, import: 'default' });

const allWords: WordData[] = [];

console.log('Vocabulary modules found:', Object.keys(modules));

for (const [path, data] of Object.entries(modules)) {
  const fullName = path.split('/').pop() || '';
  const fileName = fullName.replace(/\.json$/, '');
  const category = normalizeCategory(fileName);
  const words = (data as Omit<WordData, 'category'>[]).map(w => ({
    ...w,
    category,
  }));
  console.log(`Loaded ${words.length} words for category "${category}" from ${fullName}`);
  allWords.push(...words);
}

console.log(`Total words loaded: ${allWords.length}`);

export default allWords;