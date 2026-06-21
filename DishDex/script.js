const PATHS = {
  cafeItems: '../CafeItems.xml',

  // The script will try these until one works.
  languageFiles: [
    '../langs/Cafe_en.xml',
    '../langs/cafe_en.xml',
    '../Cafe_en.xml',
    '../Cafe_en(2).xml',
    '../Cafe_en%282%29.xml'
  ]
};

main();

async function main() {
  const status = document.getElementById('status');
  const details = document.getElementById('details');

  try {
    status.innerHTML = 'Loading Café files...';

    const cafeItemsText = await fetchText(PATHS.cafeItems);
    const cafeItemsXml = parseLooseXml(cafeItemsText);

    const wodNodes = Array.from(cafeItemsXml.getElementsByTagName('wod'));
    const dishNodes = wodNodes.filter(node => getAttr(node, 'g') === 'Dish');
    const ingredientNodes = wodNodes.filter(node => getAttr(node, 'g') === 'Ingredient');

    const languageResult = await fetchFirstWorkingLanguageFile(PATHS.languageFiles);
    const cafeEnXml = parseNormalXml(languageResult.text);

    const textNodes = Array.from(cafeEnXml.getElementsByTagName('text'));
    const recipeTexts = textNodes.filter(node => getAttr(node, 'id').toLowerCase().startsWith('recipe_'));
    const ingredientTexts = textNodes.filter(node => getAttr(node, 'id').toLowerCase().startsWith('ingredient_'));

    status.innerHTML = '<span class="ok">Success! XML files loaded.</span>';

    details.textContent =
      'CafeItems path: ' + PATHS.cafeItems + '\n' +
      'Language path: ' + languageResult.path + '\n\n' +
      'Total <wod> entries: ' + wodNodes.length + '\n' +
      'Dishes found: ' + dishNodes.length + '\n' +
      'Ingredients found: ' + ingredientNodes.length + '\n\n' +
      'Total <text> entries: ' + textNodes.length + '\n' +
      'Recipe names found: ' + recipeTexts.length + '\n' +
      'Ingredient names found: ' + ingredientTexts.length + '\n\n' +
      'First few dishes:\n' +
      dishNodes.slice(0, 8).map(node => {
        return '- ' + getAttr(node, 't') +
          ' | level ' + getAttr(node, 'level') +
          ' | XP ' + getAttr(node, 'xp') +
          ' | duration ' + getAttr(node, 'duration');
      }).join('\n');

  } catch (error) {
    status.innerHTML = '<span class="bad">Something failed.</span>';
    details.textContent = String(error.stack || error);
  }
}

async function fetchText(path) {
  const response = await fetch(path, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Could not load ' + path + ' — HTTP ' + response.status);
  }

  return await response.text();
}

async function fetchFirstWorkingLanguageFile(paths) {
  const errors = [];

  for (const path of paths) {
    try {
      const text = await fetchText(path);

      return {
        path: path,
        text: text
      };
    } catch (error) {
      errors.push(path + ' failed');
    }
  }

  throw new Error(
    'Could not load any language file.\n\nTried:\n' +
    errors.join('\n')
  );
}

function parseLooseXml(text) {
  const cleaned = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[^>]*\?>/g, '')
    .trim();

  const wrapped = '<root>\n' + cleaned + '\n</root>';
  const xml = new DOMParser().parseFromString(wrapped, 'application/xml');

  throwIfParserError(xml, 'CafeItems.xml');

  return xml;
}

function parseNormalXml(text) {
  const cleaned = String(text || '')
    .replace(/^\uFEFF/, '')
    .trim();

  const xml = new DOMParser().parseFromString(cleaned, 'application/xml');

  throwIfParserError(xml, 'language XML');

  return xml;
}

function throwIfParserError(xml, label) {
  const parserError = xml.getElementsByTagName('parsererror')[0];

  if (parserError) {
    throw new Error('XML parser error in ' + label + ':\n' + parserError.textContent);
  }
}

function getAttr(node, name) {
  return node.getAttribute(name) || '';
}
