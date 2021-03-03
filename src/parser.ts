import { loadFile, serr } from './utils/utils';
import { Surface, Var, App, Abs, Pi, Let, Hole, Type, Axiom, Def, DDef } from './surface';
import { Name } from './names';
import { isAxiomName } from './axioms';
import { log } from './config';

type BracketO = '(' | '{'
type Bracket = BracketO | ')' | '}';
const matchingBracket = (c: Bracket): Bracket => {
  if(c === '(') return ')';
  if(c === ')') return '(';
  if(c === '{') return '}';
  if(c === '}') return '{';
  return serr(`invalid bracket: ${c}`);
};

type Token
  = { tag: 'Name', name: string }
  | { tag: 'Num', num: string }
  | { tag: 'List', list: Token[], bracket: BracketO }
  | { tag: 'Str', str: string };
const TName = (name: string): Token => ({ tag: 'Name', name });
const TNum = (num: string): Token => ({ tag: 'Num', num });
const TList = (list: Token[], bracket: BracketO): Token => ({ tag: 'List', list, bracket });
const TStr = (str: string): Token => ({ tag: 'Str', str });

const SYM1: string[] = ['\\', ':', '=', '*', ';'];
const SYM2: string[] = ['->'];

const START = 0;
const NAME = 1;
const COMMENT = 2;
const NUMBER = 3;
const STRING = 4;
const tokenize = (sc: string): Token[] => {
  let state = START;
  let r: Token[] = [];
  let t = '';
  let esc = false;
  let p: Token[][] = [], b: BracketO[] = [];
  for (let i = 0, l = sc.length; i <= l; i++) {
    const c = sc[i] || ' ';
    const next = sc[i + 1] || '';
    if (state === START) {
      if (SYM2.indexOf(c + next) >= 0) r.push(TName(c + next)), i++;
      else if (SYM1.indexOf(c) >= 0) r.push(TName(c));
      else if (c === '"') state = STRING;
      else if (c === '.' && !/[\.\%\_a-z]/i.test(next)) r.push(TName('.'));
      else if (c + next === '--') i++, state = COMMENT;
      else if (/[\-\.\?\@\#\%\_a-z]/i.test(c)) t += c, state = NAME;
      else if (/[0-9]/.test(c)) t += c, state = NUMBER;
      else if(c === '(' || c === '{') b.push(c), p.push(r), r = [];
      else if(c === ')' || c === '}') {
        if(b.length === 0) return serr(`unmatched bracket: ${c}`);
        const br = b.pop() as BracketO;
        if(matchingBracket(br) !== c) return serr(`unmatched bracket: ${br} and ${c}`);
        const a: Token[] = p.pop() as Token[];
        a.push(TList(r, br));
        r = a;
      }
      else if (/\s/.test(c)) continue;
      else return serr(`invalid char ${c} in tokenize`);
    } else if (state === NAME) {
      if (!(/[a-z0-9\-\_\/]/i.test(c) || (c === '.' && /[a-z0-9]/i.test(next)))) {
        r.push(TName(t));
        t = '', i--, state = START;
      } else t += c;
    } else if (state === NUMBER) {
      if (!/[0-9a-z]/i.test(c)) {
        r.push(TNum(t));
        t = '', i--, state = START;
      } else t += c;
    } else if (state === COMMENT) {
      if (c === '\n') state = START;
    } else if (state === STRING) {
      if (c === '\\') esc = true;
      else if (esc) t += c, esc = false;
      else if (c === '"') {
        r.push(TStr(t));
        t = '', state = START;
      } else t += c;
    }
  }
  if (b.length > 0) return serr(`unclosed brackets: ${b.join(' ')}`);
  if (state !== START && state !== COMMENT)
    return serr('invalid tokenize end state');
  if (esc) return serr(`escape is true after tokenize`);
  return r;
};

const tunit = Var('U');
const unit = Var('Unit');

const isName = (t: Token, x: Name): boolean =>
  t.tag === 'Name' && t.name === x;
const isNames = (t: Token[]): Name[] =>
  t.map(x => {
    if (x.tag !== 'Name') return serr(`expected name`);
    return x.name;
  });

const splitTokens = (a: Token[], fn: (t: Token) => boolean, keepSymbol: boolean = false): Token[][] => {
  const r: Token[][] = [];
  let t: Token[] = [];
  for (let i = 0, l = a.length; i < l; i++) {
    const c = a[i];
    if (fn(c)) {
      r.push(t);
      t = keepSymbol ? [c] : [];
    } else t.push(c);
  }
  r.push(t);
  return r;
};

const lambdaParams = (t: Token): [Name, boolean, Surface | null][] => {
  if (t.tag === 'Name') return [[t.name, false, null]];
  if (t.tag === 'List') {
    const impl = t.bracket === '{';
    const a = t.list;
    if (a.length === 0) return [['_', impl, tunit]];
    const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
    if (i === -1) return isNames(a).map(x => [x, impl, null]);
    const ns = a.slice(0, i);
    const rest = a.slice(i + 1);
    const ty = exprs(rest, '(');
    return isNames(ns).map(x => [x, impl, ty]);
  }
  return serr(`invalid lambda param`);
};
const piParams = (t: Token): [Name, boolean, Surface][] => {
  if (t.tag === 'Name') return [['_', false, expr(t)[0]]];
  if (t.tag === 'List') {
    const impl = t.bracket === '{';
    const a = t.list;
    if (a.length === 0) return [['_', impl, tunit]];
    const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
    if (i === -1) return [['_', impl, expr(t)[0]]];
    const ns = a.slice(0, i);
    const rest = a.slice(i + 1);
    const ty = exprs(rest, '(');
    return isNames(ns).map(x => [x, impl, ty]);
  }
  return serr(`invalid pi param`);
};

const codepoints = (s: string): number[] => {
  const chars: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c1 = s.charCodeAt(i);
    if (c1 >= 0xD800 && c1 < 0xDC00 && i + 1 < s.length) {
      const c2 = s.charCodeAt(i + 1);
      if (c2 >= 0xDC00 && c2 < 0xE000) {
        chars.push(0x10000 + ((c1 - 0xD800) << 10) + (c2 - 0xDC00));
        i++;
        continue;
      }
    }
    chars.push(c1);
  }
  return chars;
};

const numToNat = (n: number): Surface => {
  if (isNaN(n)) return serr(`invalid nat number: ${n}`);
  const s = Var('S');
  let c: Surface = Var('Z');
  for (let i = 0; i < n; i++) c = App(s, false, c);
  return c;
};

const expr = (t: Token): [Surface, boolean] => {
  if (t.tag === 'List')
    return [exprs(t.list, '('), t.bracket === '{'];
  if (t.tag === 'Str') {
    const s = codepoints(t.str).reverse();
    const Cons = Var('Cons');
    const Nil = Var('Nil');
    return [s.reduce((t, n) => App(App(Cons, false, numToNat(n)), false, t), Nil as Surface), false];
  }
  if (t.tag === 'Name') {
    const x = t.name;
    if (x === '*') return [Type, false];
    if (x.startsWith('_')) {
      const rest = x.slice(1);
      return [Hole(rest.length > 0 ? rest : null), false];
    }
    if (x[0] === '%') {
      const rest = x.slice(1);
      if (isAxiomName(rest)) return [Axiom(rest), false];
      return serr(`invalid axiom: ${x}`);
    }
    if (/[a-z]/i.test(x[0])) return [Var(x), false];
    return serr(`invalid name: ${x}`);
  }
  if (t.tag === 'Num') {
    if (t.num.endsWith('b')) {
      const n = +t.num.slice(0, -1);
      if (isNaN(n)) return serr(`invalid number: ${t.num}`);
      const s0 = Var('B0');
      const s1 = Var('B1');
      let c: Surface = Var('BE');
      const s = n.toString(2);
      for (let i = 0; i < s.length; i++) c = App(s[i] === '0' ? s0 : s1, false, c);
      return [c, false];
    } else if (t.num.endsWith('f')) {
      const n = +t.num.slice(0, -1);
      if (isNaN(n)) return serr(`invalid number: ${t.num}`);
      const s = Var('FS');
      let c: Surface = Var('FZ');
      for (let i = 0; i < n; i++) c = App(s, false, c);
      return [c, false];
    } else if (t.num.endsWith('n')) {
      return [numToNat(+t.num.slice(0, -1)), false];
    } else {
      return [numToNat(+t.num), false];
    }
  }
  return t;
};

const exprs = (ts: Token[], br: BracketO): Surface => {
  if (br === '{') return serr(`{} cannot be used here`);
  if (ts.length === 0) return unit;
  if (ts.length === 1) return expr(ts[0])[0];
  if (isName(ts[0], 'let')) {
    const x = ts[1];
    let name = 'ERROR';
    let erased = false;
    if (x.tag === 'Name') {
      name = x.name;
    } else if (x.tag === 'List' && x.bracket === '{') {
      const a = x.list;
      if (a.length !== 1) return serr(`invalid name for let`);
      const h = a[0];
      if (h.tag !== 'Name') return serr(`invalid name for let`);
      name = h.name;
      erased = true;
    } else return serr(`invalid name for let`);
    let ty: Surface | null = null;
    let j = 2;
    if (isName(ts[j], ':')) {
      const tyts: Token[] = [];
      j++;
      for (; j < ts.length; j++) {
        const v = ts[j];
        if (v.tag === 'Name' && v.name === '=')
          break;
        else tyts.push(v);
      }
      ty = exprs(tyts, '(');
    }
    if (!isName(ts[j], '=')) return serr(`no = after name in let`);
    const vals: Token[] = [];
    let found = false;
    let i = j + 1;
    for (; i < ts.length; i++) {
      const c = ts[i];
      if (c.tag === 'Name' && c.name === ';') {
        found = true;
        break;
      }
      vals.push(c);
    }
    if (!found) return serr(`no ; after let`);
    if (vals.length === 0) return serr(`empty val in let`);
    const val = exprs(vals, '(');
    const body = exprs(ts.slice(i + 1), '(');
    if (ty)
      return Let(erased, name, ty, val, body);
    return Let(erased, name, null, val, body);
  }
  const i = ts.findIndex(x => isName(x, ':'));
  if (i >= 0) {
    const a = ts.slice(0, i);
    const b = ts.slice(i + 1);
    return Let(false, 'x', exprs(b, '('), exprs(a, '('), Var('x'));
  }
  if (isName(ts[0], '\\')) {
    const args: [Name, boolean, Surface | null][] = [];
    let found = false;
    let i = 1;
    for (; i < ts.length; i++) {
      const c = ts[i];
      if (isName(c, '.')) {
        found = true;
        break;
      }
      lambdaParams(c).forEach(x => args.push(x));
    }
    if (!found) return serr(`. not found after \\ or there was no whitespace after .`);
    const body = exprs(ts.slice(i + 1), '(');
    return args.reduceRight((x, [name, impl, ty]) => Abs(impl, name, ty, x), body);
  }
  const j = ts.findIndex(x => isName(x, '->'));
  if (j >= 0) {
    const s = splitTokens(ts, x => isName(x, '->'));
    if (s.length < 2) return serr(`parsing failed with ->`);
    const args: [Name, boolean, Surface][] = s.slice(0, -1)
      .map(p => p.length === 1 ? piParams(p[0]) : [['_', false, exprs(p, '(')] as [Name, boolean, Surface]])
      .reduce((x, y) => x.concat(y), []);
    const body = exprs(s[s.length - 1], '(');
    return args.reduceRight((x, [name, impl, ty]) => Pi(impl, name, ty, x), body);
  }
  const l = ts.findIndex(x => isName(x, '\\'));
  let all = [];
  if (l >= 0) {
    const first = ts.slice(0, l).map(expr);
    const rest = exprs(ts.slice(l), '(');
    all = first.concat([[rest, false]]);
  } else {
    all = ts.map(expr);
  }
  if (all.length === 0) return serr(`empty application`);
  if (all[0] && all[0][1]) return serr(`in application function cannot be between {}`);
  return all.slice(1).reduce((x, [y, impl]) => App(x, impl, y), all[0][0]);
};

export const parse = (s: string): Surface => {
  const ts = tokenize(s);
  const ex = exprs(ts, '(');
  return ex;
};

export type ImportMap = { [key: string]: boolean };
export const parseDef = async (c: Token[], importMap: ImportMap): Promise<Def[]> => {
  if (c.length === 0) return [];
  if (c[0].tag === 'Name' && c[0].name === 'import') {
    const files = c.slice(1).map(t => {
      if (t.tag !== 'Name') return serr(`trying to import a non-path`);
      if (importMap[t.name]) {
        log(() => `skipping import ${t.name}`);
        return null;
      }
      return t.name;
    }).filter(x => x) as string[];
    log(() => `import ${files.join(' ')}`);
    const imps: string[] = await Promise.all(files.map(loadFile));
    const defs: Def[][] = await Promise.all(imps.map(s => parseDefs(s, importMap)));
    const fdefs = defs.reduce((x, y) => x.concat(y), []);
    fdefs.forEach(t => importMap[t.name] = true);
    log(() => `imported ${fdefs.map(x => x.name).join(' ')}`);
    return fdefs;
  } else if (c[0].tag === 'Name' && c[0].name === 'def') {
    let name = '';
    let erased = false;
    if (c[1].tag === 'Name') name = c[1].name;
    else if (c[1].tag === 'List' && c[1].bracket === '{') {
      const xs = c[1].list;
      if (xs.length === 1 && xs[0].tag === 'Name') {
        name = xs[0].name;
        erased = true;
      } else return serr(`invalid name for def`);
    } else return serr(`invalid name for def`);
    const fst = 2;
    const sym = c[fst];
    if (sym.tag !== 'Name') return serr(`def: after name should be : or =`);
    if (sym.name === '=') {
      return [DDef(erased, name, exprs(c.slice(fst + 1), '('))];
    } else if (sym.name === ':') {
      const tyts: Token[] = [];
      let j = fst + 1;
      for (; j < c.length; j++) {
        const v = c[j];
        if (v.tag === 'Name' && v.name === '=')
          break;
        else tyts.push(v);
      }
      const ety = exprs(tyts, '(');
      const body = exprs(c.slice(j + 1), '(');
      return [DDef(erased, name, Let(false, name, ety, body, Var(name)))];
    } else return serr(`def: : or = expected but got ${sym.name}`);
  } else return serr(`def should start with def or import`);
};

export const parseDefs = async (s: string, importMap: ImportMap): Promise<Def[]> => {
  const ts = tokenize(s);
  if (ts[0].tag !== 'Name' || (ts[0].name !== 'def' && ts[0].name !== 'import'))
    return serr(`def should start with "def" or "import"`);
  const spl = splitTokens(ts, t => t.tag === 'Name' && (t.name === 'def' || t.name === 'import'), true);
  const ds: Def[][] = await Promise.all(spl.map(s => parseDef(s, importMap)));
  return ds.reduce((x, y) => x.concat(y), []);
};
