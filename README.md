# h11

Монорепозиторий с самописным HTTP-стеком на Bun/TypeScript: минималистичный роутер (`h11`), слой раздачи статики и провайдеров рантайма (`h11-fs`), и SSR-надстройка поверх Vite + [regan](https://www.npmjs.com/package/regan) (`h11-x`).

## Пакеты

| Пакет | Что делает |
|---|---|
| [`packages/h11`](./packages/h11) | Ядро — класс `H11` с radix-роутером, middleware, обработкой ошибок |
| [`packages/h11-fs`](./packages/h11-fs) | Раздача статики + провайдеры для запуска `H11` под Bun или Node |
| [`packages/h11-x`](./packages/h11-x) | SSR/гидрация поверх `h11` + Vite + regan |
| [`packages/h11-x-example`](./packages/h11-x-example) | Рабочий пример, связывающий всё вместе |

## Разработка

```bash
bun install
bun test    # тесты всех пакетов
```

Каждый пакет собирается независимо:

```bash
cd packages/h11 && bun run build && bun run types
```

Либо через оркестратор задач [`dapes`](https://www.npmjs.com/package/dapes), который знает о зависимостях между пакетами (`h11` → `h11-fs` → `h11-x` → `h11-x-example`):

```bash
bun run dapes.run.ts x build        # соберёт h11 → h11-fs → h11-x по цепочке
bun run dapes.run.ts example run    # поднимет пример на :3000
```

## Статус

Личный/экспериментальный проект. `h11` и `h11-fs` покрыты тестами и относительно устоялись; `h11-x` — активно меняющийся SSR-слой (версия `0.0.x`), API может измениться без предупреждения.
