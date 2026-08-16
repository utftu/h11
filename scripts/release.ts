import { $ } from 'bun';

const pkg = process.argv[2];

if (!pkg) {
  console.error('Использование: bun run release <package-name>');
  process.exit(1);
}

const pkgPath = `packages/${pkg}/package.json`;
const pkgFile = Bun.file(pkgPath);

if (!(await pkgFile.exists())) {
  console.error(`Нет ${pkgPath}`);
  process.exit(1);
}

const { version } = await pkgFile.json();
if (!version) {
  console.error(`В ${pkgPath} нет поля "version"`);
  process.exit(1);
}

const tag = `${pkg}@${version}`;

const existingTags = (await $`git tag -l ${tag}`.text()).trim();
if (existingTags) {
  console.error(
    `Тег ${tag} уже существует — похоже, версию в package.json забыли бампнуть`,
  );
  process.exit(1);
}

console.log(`Пакет:  ${pkg}`);
console.log(`Версия: ${version}`);
console.log(`Тег:    ${tag}`);

const answer = prompt(`Создать и запушить тег ${tag}? (Y/n)`);
if (answer?.trim().toLowerCase() !== 'n') {
  console.log('Отменено');
  process.exit(0);
}

await $`git tag ${tag}`;
await $`git push origin ${tag}`;

console.log(
  `Готово: ${tag} запушен, CI (publish.yml) должен подхватить публикацию`,
);
