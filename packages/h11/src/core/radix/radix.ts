import type { Handler, Method } from '../../types.ts';

// Узел дерева — это один сегмент пути. Маршрут "/users/:id" превращается в
// цепочку: корень → "users" → ":id".
export class Node {
  // Сегмент, которым узел подошёл. У статического это само имя ("users"), у
  // параметрического — имя вместе с двоеточием (":id"): по нему find и
  // отличает одно от другого. У корня — пустая строка.
  segment: string;

  // Хендлеры маршрута, который кончается ровно здесь, по методам. Узел может
  // быть и чисто транзитным — тогда тут пусто, и вариантом маршрута он не
  // станет, хотя спуск через него идёт.
  handlers: Partial<Record<Method, Handler[]>> = {};

  // Хендлеры "/**", зарегистрированного на этом узле. Лежат отдельно от
  // handlers, потому что ловят любой хвост пути начиная отсюда, а не
  // конкретный маршрут, и потому что пробуются последними.
  wilds: Partial<Record<Method, Handler[]>> = {};

  // Миддлвари узла. Без разбивки по методам: они работают на всё поддерево и
  // на любой метод, включая те, под которые тут нет ни одного маршрута.
  middlewares: Handler[] = [];

  // Дети с точным именем сегмента. Именно Map, а не объект: ключ приходит из
  // url, и Map не спутает его с прототипными именами вроде "constructor".
  staticChildren: Map<string, Node> = new Map();

  // Параметрический ребёнок ровно один. Два разных имени на одном уровне
  // (/a/:x и /a/:y) запрещены в findOrCreateNode: выбирать между ними было бы
  // не по чему, оба подходят под любой сегмент.
  paramChild?: Node;

  constructor({ segment }: { segment: string }) {
    this.segment = segment;
  }
}

type Params = Record<string, string>;

// Один подошедший вариант маршрута: свои параметры и своя цепочка хендлеров.
// Вариантов может быть несколько — их пробуют по очереди, пока кто-то не
// ответит.
export type Match = {
  params: Params;
  handlers: Handler[];
};

// Миддлвари общие для всех вариантов: они подошли по пути, а не по маршруту,
// и выполняются один раз до вариантов. Иначе middleware, читающая тело
// запроса, отработала бы повторно на каждом следующем кандидате.
export type FindResult = {
  middlewares: Handler[];
  matches: Match[];
};

export class Radix {
  root = new Node({ segment: '' });

  // Собирает ВСЕ подошедшие маршруты, а не первый попавшийся: дерево
  // обходится в глубину, и каждый дошедший до конца пути узел становится
  // вариантом. Порядок вариантов — это и есть приоритет, дальше exec просто
  // идёт по списку сверху вниз.
  find(path: string, method: Method = 'GET'): FindResult {
    // "/hello/" — это тот же маршрут, что и "/hello": хвостовой слэш даёт
    // пустой сегмент в конце, которому ничего не соответствует. Корень
    // остаётся корнем.
    let pathPrepared = path;
    while (pathPrepared.length > 1 && pathPrepared.endsWith('/')) {
      pathPrepared = pathPrepared.slice(0, -1);
    }

    // "/users/42" → ['', 'users', '42']. Первый сегмент пустой, и ему
    // соответствует корневой узел, поэтому индекс сегмента и глубина узла
    // совпадают.
    const segments = pathPrepared.split('/');

    const middlewares: Handler[] = [];
    const matches: Match[] = [];
    // Wildcards копятся отдельно: их черёд после всех точных и
    // параметрических вариантов, поэтому в matches они попадают в самом
    // конце, уже развёрнутыми — от самого глубокого к самому общему.
    const wilds: Match[] = [];

    // index — какой сегмент пути соответствует этому узлу, params —
    // параметры, накопленные по дороге сюда. Копия params делается только на
    // параметрическом узле, поэтому ветки друг другу ничего не портят, а
    // обычный статический спуск не аллоцирует вообще ничего.
    const walk = (node: Node, index: number, params: Params) => {
      // Миддлвари узла подошли по пути, а не по маршруту, поэтому копятся в
      // общий список: какой бы вариант в итоге ни ответил, они всё равно его
      // касаются. Узел на одном пути посещается один раз, так что и
      // дубликатов тут не будет.
      middlewares.push(...node.middlewares);

      // Параметр узла записывается до сбора wildcard, иначе "/users/:id/**"
      // отдал бы хендлеру только wild, потеряв id.
      let paramsNext = params;
      if (node.segment[0] === ':') {
        paramsNext = { ...params, [node.segment.slice(1)]: segments[index] };
      }

      // "/**" ловит весь остаток пути, поэтому вариант можно записать прямо
      // здесь, не спускаясь дальше: что бы ни было ниже, для wildcard это
      // просто строка в params.wild.
      const wildHandlers = node.wilds[method];
      if (wildHandlers) {
        wilds.push({
          params: { ...paramsNext, wild: segments.slice(index + 1).join('/') },
          handlers: wildHandlers,
        });
      }

      // Путь кончился — значит этот узел и есть конец маршрута. Хендлеры
      // берутся по методу: узел может существовать только ради POST, и тогда
      // для GET он вариантом не станет, а ход уйдёт следующей ветке.
      if (index + 1 === segments.length) {
        const handlers = node.handlers[method];
        if (handlers) {
          matches.push({ params: paramsNext, handlers });
        }
        return;
      }

      const nextSegment = segments[index + 1];

      // Обе ветки обходятся всегда, и это главное отличие от прежнего
      // поиска: раньше найденный статический ребёнок отменял параметрическую
      // ветку целиком. Статический идёт первым — отсюда и приоритет статики
      // над параметром в итоговом списке.
      const staticChild = node.staticChildren.get(nextSegment);
      if (staticChild) {
        walk(staticChild, index + 1, paramsNext);
      }

      // Пустой сегмент (двойной слэш или хвостовой "/") параметром быть не
      // должен — ":id" в "/users//edit" не имеет значения.
      if (node.paramChild && nextSegment !== '') {
        walk(node.paramChild, index + 1, paramsNext);
      }
    };

    walk(this.root, 0, {});

    // Разворот: wilds заполнялся сверху вниз, а пробовать их надо наоборот —
    // "/h11x/**" раньше, чем "/**", иначе общий перехватил бы всё.
    for (let i = wilds.length - 1; i >= 0; i--) {
      matches.push(wilds[i]);
    }

    return { middlewares, matches };
  }

  // Паттерн всегда абсолютный и никогда не кончается слэшем: "users" молча
  // создал бы узел "sers" (первый символ срезается как слэш), а "/users/" —
  // пустой сегмент в конце, который ничему не соответствует.
  private checkPattern(pattern: string) {
    if (!pattern.startsWith('/')) {
      throw new Error(`Pattern "${pattern}" must start with "/"`);
    }

    if (pattern.length > 1 && pattern.endsWith('/')) {
      throw new Error(`Pattern "${pattern}" must not end with "/"`);
    }
  }

  private findOrCreateNode(pattern: string): Node {
    const patternSegments = pattern.slice(1).split('/');
    let currentNode = this.root;

    for (const segment of patternSegments) {
      if (segment[0] === ':') {
        if (!currentNode.paramChild) {
          currentNode.paramChild = new Node({ segment });
        }

        // Узел хранит одного параметрического ребёнка, поэтому два разных
        // имени на одном уровне молча слились бы в первое.
        if (currentNode.paramChild.segment !== segment) {
          throw new Error(
            `Param conflict in "${pattern}": "${currentNode.paramChild.segment}" is already used on this level`,
          );
        }

        currentNode = currentNode.paramChild;
      } else {
        let child = currentNode.staticChildren.get(segment);
        if (!child) {
          child = new Node({ segment });
          currentNode.staticChildren.set(segment, child);
        }
        currentNode = child;
      }
    }

    return currentNode;
  }

  // Повторная регистрация дописывает хендлеры в конец, а не затирает
  // предыдущие: два get на один путь — это цепочка, как и всё остальное в
  // роутере.
  add(pattern: string, method: Method = 'GET', handlers: Handler[]) {
    this.checkPattern(pattern);

    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3);
      const node = prefix ? this.findOrCreateNode(prefix) : this.root;
      node.wilds[method] = [...(node.wilds[method] ?? []), ...handlers];
      return node;
    }

    const node = this.findOrCreateNode(pattern);
    node.handlers[method] = [...(node.handlers[method] ?? []), ...handlers];
    return node;
  }

  // Миддлвари узла и так работают на всё поддерево, поэтому "/api/**" — это
  // тот же узел, что и "/api". Без этого "**" уехал бы в имя статического
  // сегмента и миддлварь молча не подключилась бы.
  addMiddleware(pattern: string, handlers: Handler[]) {
    this.checkPattern(pattern);

    const prefix = pattern.endsWith('/**') ? pattern.slice(0, -3) : pattern;
    const node =
      prefix === '' || prefix === '/'
        ? this.root
        : this.findOrCreateNode(prefix);
    node.middlewares.push(...handlers);
  }
}
