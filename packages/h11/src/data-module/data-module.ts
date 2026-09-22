import type { Handler } from '../types.ts';

// Миддлварь, которая дописывает свои поля в ctx.data: auth кладёт user,
// трейсинг — свой id. Маркер __adds живёт только в типах — в рантайме его
// никто не пишет и не читает. Он обязательный, и в этом весь смысл: раньше он
// был опциональным, под DataModule подходил любой хендлер, и H11 после любого
// .use() считал, что data пополнилась неизвестно чем.
export type DataModule<TAdded extends Record<any, any>> = Handler<any> & {
  __adds: TAdded;
};

// Помечает обычный хендлер как модуль, дописывающий поля в data. Тип полей
// задаётся явно — вывести его из присваиваний внутри функции нельзя.
export const createDataModule = <TAdded extends Record<any, any>>(
  handler: Handler<any>,
): DataModule<TAdded> => {
  return handler as DataModule<TAdded>;
};
