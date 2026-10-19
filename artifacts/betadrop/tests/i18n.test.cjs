const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');

function loadI18n(saved) {
  const values = new Map(saved === undefined ? [] : [['bd-language', saved]]);
  const events = {};
  const document = { documentElement: { lang: '' } };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
      module, exports: module.exports, document,
      localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
      window: { addEventListener: (type, fn) => { events[type] = fn; } },
      require: name => name === 'react'
        ? { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() }
        : load(path.resolve(path.dirname(file), `${name}.ts`)),
    }, { filename: file });
    return module.exports;
  }
  return { api: load(path.join(root, 'lib/i18n.ts')), values, document, events, load };
}

const fresh = loadI18n();
assert.equal(fresh.api.getLanguage(), 'en', 'New visitors must see English');
assert.equal(fresh.document.documentElement.lang, 'en');
assert.equal(fresh.api.t('Каталог'), 'Explore');
fresh.api.setLanguage('az');
assert.equal(fresh.api.t('Каталог'), 'Kataloq');
assert.equal(fresh.api.t('{count} ч', { count: 12 }), '12 saat');
assert.equal(fresh.api.getLocale(), 'az-AZ');
assert.equal(fresh.values.get('bd-language'), 'az');
assert.equal(fresh.document.documentElement.lang, 'az');
assert.equal(loadI18n('az').api.getLanguage(), 'az', 'Saved choice must survive reload');
assert.equal(loadI18n('invalid').api.getLanguage(), 'en', 'Invalid saved choice must use English');
fresh.api.setLanguage('ru');
assert.equal(fresh.api.t('Каталог'), 'Каталог');
fresh.events.storage({ key: 'bd-language', newValue: 'az' });
assert.equal(fresh.api.getLanguage(), 'az', 'Other tabs must update');
fresh.events.storage({ key: 'bd-language', newValue: null });
assert.equal(fresh.api.getLanguage(), 'en');
const authored = { demo: false, title: 'Название пользователя' };
assert.equal(fresh.api.localizeCampaign(authored), authored, 'Authored content must not be translated');
const demo = { demo: true, title: 'VectorDB: поиск быстрее мысли', description: '', reward: '3 месяца Pro License', instructions: '', screeningQuestions: [] };
assert.equal(fresh.api.localizeCampaign(demo).title, 'VectorDB: search at the speed of thought');

const dictionaries = [['core', 'core'], ['public', 'publicMessages'], ['workspace', 'workspaceMessages']].map(([name, exported]) =>
  fresh.load(path.join(root, `lib/locales/${name}.ts`))[exported]);
const messages = Object.assign({}, ...dictionaries);
for (const [key, translations] of Object.entries(messages)) {
  assert.equal(translations.length, 2, `Missing language for ${key}`);
  assert(translations.every(value => typeof value === 'string' && value.trim()), `Empty translation for ${key}`);
  const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',');
  for (const value of translations) {
    assert.equal(placeholders(value), placeholders(key), `Placeholder mismatch for ${key}`);
    assert(!/[А-Яа-яЁё]/.test(value), `Untranslated Russian in ${key}`);
  }
}

const missing = new Set();
for (const directory of ['pages', 'components']) {
  for (const file of fs.readdirSync(path.join(root, directory)).filter(file => file.endsWith('.tsx'))) {
    const fullPath = path.join(root, directory, file);
    const source = ts.createSourceFile(fullPath, fs.readFileSync(fullPath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) && /[А-Яа-яЁё]/.test(node.text)) {
        const text = node.text.trim();
        // These are server-generated event prefixes parsed before localization,
        // not UI literals; the resulting interpolation is translated.
        const protocolPrefix = ['Новая заявка:', 'Отчёт отправлен:'].includes(text);
        if (text && !protocolPrefix && !messages[text]) missing.add(`${file}: ${text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
assert.equal([...missing].join('\n'), '', 'Every Russian UI literal needs EN/AZ coverage');
console.log(`Passed language defaults, persistence, cross-tab sync, demo isolation, interpolation and ${Object.keys(messages).length} translation entries.`);
