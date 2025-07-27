// Швидкий тест нових сервісів
// Запустити: node quick-test.js

console.log('🧪 Швидкий тест нових сервісів...\n');

// Перевірка наявності файлів
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'types/index.ts',
  'utils/dom-utils.ts', 
  'services/storage-service.ts',
  'services/object-service.ts',
  'adapters/legacy-adapter.ts',
  'test-integration.ts',
  'test-services.html'
];

console.log('📁 Перевірка наявності файлів:');
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - НЕ ЗНАЙДЕНО`);
  }
});

console.log('\n📊 Статистика:');
const stats = {
  totalFiles: filesToCheck.length,
  foundFiles: filesToCheck.filter(file => fs.existsSync(file)).length,
  missingFiles: filesToCheck.filter(file => !fs.existsSync(file)).length
};

console.log(`- Всього файлів: ${stats.totalFiles}`);
console.log(`- Знайдено: ${stats.foundFiles}`);
console.log(`- Відсутні: ${stats.missingFiles}`);

if (stats.missingFiles === 0) {
  console.log('\n🎉 Всі файли на місці! Тестування пройшло успішно.');
} else {
  console.log('\n⚠️ Є відсутні файли. Перевірте створення.');
}

// Перевірка розміру файлів
console.log('\n📏 Розмір файлів:');
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`- ${file}: ${sizeKB} KB`);
  }
});

console.log('\n✅ Швидкий тест завершено!'); 