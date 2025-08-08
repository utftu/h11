async function readRequestBodyWithLimit(request: Request, maxSize: number) {
  if (!request.body) {
    return;
  }

  const reader = request.body.getReader();

  let totalSize = 0;
  let chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalSize += value.length;

    // Проверка на превышение максимального размера тела
    if (totalSize > maxSize) {
      return;
    }

    chunks.push(...value);
  }

  // Преобразование Uint8Array в строку
  const bodyString = new TextDecoder().decode(new Uint8Array(chunks));

  return JSON.parse(bodyString);
}

const a = () => {};

const b = <TArr extends Array<(...args: any[]) => any>>(
  arr: TArr
): TArr[TArr['length']] => {
  // Логика выполнения функций
  return arr.at(-1)?.();
};

const bb = b([]);
