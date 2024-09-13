export type ProviderResponse = {
  req: Request;
  providers: Record<string, any>;
};

type A = Record<string, any>;
type B = { hello: 'world' };
type C = A & B;

const c: C = null as any as C;
