import type { HandlerReturn } from '../types.ts';

export type SwitchParam = {
  check: (req: Request) => boolean | Promise<boolean>;
  handler: (req: Request) => HandlerReturn | Promise<HandlerReturn>;
};

export const switchFunc = async (
  conditions: SwitchParam[],
  req: Request
): Promise<HandlerReturn> => {
  for (const condition of conditions) {
    if (condition.check(req)) {
      const result = await condition.handler(req);
      return result;
    }
  }

  return [];
};
