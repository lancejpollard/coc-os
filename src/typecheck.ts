import { Term } from './syntax';
import { Ix, Name } from './names';
import { List, Cons, listToString } from './utils/list';
import { Val, showTermQ, EnvV } from './domain';
import { log } from './config';

type EnvT = List<[boolean, Val]>;
const extendT = (ts: EnvT, val: Val, bound: boolean): EnvT => Cons([bound, val], ts);
const showEnvT = (ts: EnvT, k: Ix = 0, full: boolean = false): string =>
  listToString(ts, ([b, v]) => `${b ? '' : 'def '}${showTermQ(v, k, full)}`);

interface Local {
  
}

const erasedUsed = (k: Ix, t: Term): boolean => {
  if (t.tag === 'Var') return t.index === k;
  if (t.tag === 'App') return erasedUsed(k, t.left) || (!t.plicity && erasedUsed(k, t.right));
  if (t.tag === 'Abs') return erasedUsed(k + 1, t.body);
  if (t.tag === 'Let') return erasedUsed(k + 1, t.body) || (!t.plicity && erasedUsed(k, t.val));
  if (t.tag === 'Ann') return erasedUsed(k, t.term);
  return false;
};

const check = (ns: List<Name>, ts: EnvT, vs: EnvV, k: Ix, k2: Ix, tm: Term, ty: Val): void => {
  log(() => `check ${showSurface(tm, ns)} : ${showTermU(ty, ns, k)} in ${showEnvT(ts, k, false)} and ${showEnvV(vs, k, false)}`);
  if (ty.tag === 'VType' && tm.tag === 'Type') return;
  const tyf = force(ty);
  log(() => `check after ${showTermU(tyf, ns, k)}`);
  if (tm.tag === 'Abs' && !tm.type && tyf.tag === 'VPi' && eqPlicity(tm.plicity, tyf.plicity)) {
    const v = VVar(k);
    const body = check(Cons(tm.name, ns), extendT(ts, tyf.type, true), extendV(vs, v), k + 1, tm.body, tyf.body(v));
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    return Abs(tm.plicity, tm.name === '_' ? tyf.name : tm.name, quote(tyf.type, k, false), body);
  }
  if (tyf.tag === 'VPi' && tyf.plicity.erased && !(tm.tag === 'Abs' && tm.type && tm.plicity.erased)) {
    const v = VVar(k);
    const body = check(Cons(tyf.name, ns), extendT(ts, tyf.type, true), extendV(vs, v), k + 1, shift(1, 0, tm), tyf.body(v));
    return Abs(tyf.plicity, tyf.name, quote(tyf.type, k, false), body);
  }
  if (tm.tag === 'Roll' && !tm.type && tyf.tag === 'VFix') {
    const term = check(ns, ts, vs, k, tm.term, tyf.body(ty));
    return Roll(quote(ty, k, false), term);
  }
  if (tm.tag === 'Let') {
    const [val, vty] = synth(ns, ts, vs, k, tm.val);
    const body = check(Cons(tm.name, ns), extendT(ts, vty, false), extendV(vs, evaluate(val, vs)), k + 1, tm.body, ty);
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    return Let(tm.plicity, tm.name, val, body);
  }
  if (tm.tag === 'Hole') {
    const x = newMeta(ts);
    if (tm.name) {
      if (holes[tm.name]) return terr(`named hole used more than once: _${tm.name}`);
      holes[tm.name] = [evaluate(x, vs), ty, ns, k, vs, ts];
    }
    return x;
  }
  const [term, ty2] = synth(ns, ts, vs, k, tm);
  const [ty2inst, targs] = inst(ts, vs, ty2);
  try {
    unify(ns, k, ty2inst, ty);
  } catch(err) {
    if (!(err instanceof TypeError)) throw err;
    return terr(`failed to unify ${showTermU(ty2, ns, k)} ~ ${showTermU(ty, ns, k)}: ${err.message}`);
  }
  return foldl((a, m) => App(a, PlicityE, m), term, targs);
};

const freshPi = (ts: EnvT, vs: EnvV, x: Name, impl: Plicity): Val => {
  const a = newMeta(ts);
  const va = evaluate(a, vs);
  const b = newMeta(Cons([true, va], ts));
  return VPi(impl, x, va, v => evaluate(b, extendV(vs, v)));
};

type ADTCase = [Name, Plicity, Term];
type ADT = [Name, ADTCase[]][];
const makeInduction = (t: Term, gty: Term, gterm: Term): Term => {
  if (!(t.tag === 'Pi' && t.type === Type && t.plicity.erased)) return terr(`makeInduction error`);
  const [cs, rt] = flattenPi(t.body);
  if (!(rt.tag === 'Var' && rt.index === cs.length)) return terr(`makeInduction error`);
  const adt: ADT = cs.map(([x, pl, t], i) => {
    if (pl.erased) return terr(`makeInduction error`);
    const [as, rt] = flattenPi(t);
    if (!(rt.tag === 'Var' && rt.index === as.length + i)) return terr(`makeInduction error`);
    return [x, as];
  });
  const indterm = Pi(PlicityE, 'P', Pi(PlicityR, '_', gty, Type),
    adt.reduceRight((body, [x, as], i) => Pi(PlicityR, x === '_' ? `c${i}` : x, makeInductionCases(as, i, adt), body),
      App(Var(cs.length), PlicityR, shift(cs.length + 1, 0, gterm)) as Term));
  return indterm;
};
const makeInductionCases = (as: ADTCase[], i: number, adt: ADT): Term => {
  const cases = as.reduceRight((body, [x, pl, t], j) => Pi(pl, x === '_' ? `a${j}` : x, t, body),
    App(Var(as.length + i), PlicityR, makeInductionConstr(as, i, adt)) as Term);
  return cases;
};
const makeInductionConstr = (as: ADTCase[], i: number, adt: ADT): Term => {
  const constr = as.reduce((body, [x, pl, t], j) => App(body, pl, Var(as.length - j + adt.length)),
    Var(adt.length - i - 1) as Term);
  return makeInductionConstrPrefix(adt, constr, i);
};
const makeInductionConstrPrefix = (adt: ADT, body: Term, k: number): Term => {
  const tms = adt.reduceRight((body, [x, as], i) =>
    Abs(PlicityR, x === '_' ? `c${i}` : x, makeInductionConstrPrefixType(as, i, adt, k), body), body);
  return Abs(PlicityE, 't', Type, tms);
};
const makeInductionConstrPrefixType = (as: ADTCase[], i: number, adt: ADT, k: number): Term =>
  as.reduceRight((body, [x, pl, ty], j) =>
    Pi(pl, x === '_' ? `p${j}` : x, shift(2 + k + as.length - 1, 1, ty), body),
    Var(as.length + i) as Term);

const synth = (ns: List<Name>, ts: EnvT, vs: EnvV, k: Ix, tm: Term): [Term, Val] => {
  log(() => `synth ${showFromSurface(tm, ns)} in ${showEnvT(ts, k, false)} and ${showEnvV(vs, k, false)}`);
  if (tm.tag === 'Type') return [tm, VType];
  if (tm.tag === 'Var') {
    const res = index(ts, tm.index);
    if (!res) return terr(`var out of scope ${showFromSurface(tm, ns)}`);
    return [tm, res[1]];
  }
  if (tm.tag === 'Global') {
    const entry = globalGet(tm.name);
    if (!entry) return terr(`global ${tm.name} not found`);
    return [tm, entry.type];
  }
  if (tm.tag === 'Hole') {
    const t = newMeta(ts);
    const vt = evaluate(newMeta(ts), vs);
    if (tm.name) {
      if (holes[tm.name]) return terr(`named hole used more than once: _${tm.name}`);
      holes[tm.name] = [evaluate(t, vs), vt, ns, k, vs, ts];
    }
    return [t, vt];
  }
  if (tm.tag === 'App') {
    const [fntm, fn] = synth(ns, ts, vs, k, tm.left);
    const [rt, res, ms] = synthapp(ns, ts, vs, k, fn, tm.plicity, tm.right);
    return [App(foldl((f, a) => App(f, PlicityE, a), fntm, ms), tm.plicity, res), rt];
  }
  if (tm.tag === 'Abs') {
    if (tm.type) {
      const type = check(ns, ts, vs, k, tm.type, VType);
      const vtype = evaluate(type, vs);
      const [body, rt] = synth(Cons(tm.name, ns), extendT(ts, vtype, true), extendV(vs, VVar(k)), k + 1, tm.body);
      if (tm.plicity.erased && erasedUsed(0, tm.body))
        return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
      // TODO: avoid quote here
      const pi = evaluate(Pi(tm.plicity, tm.name, type, quote(rt, k + 1, false)), vs);
      return [Abs(tm.plicity, tm.name, type, body), pi];
    } else {
      const pi = freshPi(ts, vs, tm.name, tm.plicity);
      const term = check(ns, ts, vs, k, tm, pi);
      return [term, pi];
    }
  }
  if (tm.tag === 'Let') {
    const [val, vty] = synth(ns, ts, vs, k, tm.val);
    const [body, rt] = synth(Cons(tm.name, ns), extendT(ts, vty, false), extendV(vs, evaluate(val, vs)), k + 1, tm.body);
    if (tm.plicity.erased && erasedUsed(0, tm.body))
      return terr(`erased argument used in ${showFromSurface(tm, ns)}`);
    return [Let(tm.plicity, tm.name, val, body), rt];
  }
  if (tm.tag === 'Pi') {
    const type = check(ns, ts, vs, k, tm.type, VType);
    const body = check(Cons(tm.name, ns), extendT(ts, evaluate(type, vs), true), extendV(vs, VVar(k)), k + 1, tm.body, VType);
    return [Pi(tm.plicity, tm.name, type, body), VType];
  }
  if (tm.tag === 'Fix') {
    const type = check(ns, ts, vs, k, tm.type, VType);
    const vt = evaluate(type, vs);
    const body = check(Cons(tm.name, ns), extendT(ts, vt, true), extendV(vs, VVar(k)), k + 1, tm.body, vt);
    return [Fix(tm.name, type, body), vt];
  }
  if (tm.tag === 'Roll' && tm.type) {
    const type = check(ns, ts, vs, k, tm.type, VType);
    const vt = evaluate(type, vs);
    const vtf = force(vt);
    if (vtf.tag === 'VFix') {
      const term = check(ns, ts, vs, k, tm.term, vtf.body(vt));
      return [Roll(type, term), vt];
    }
    return terr(`fix type expected in ${showFromSurface(tm, ns)}: ${showTermU(vt, ns, k)}`);
  }
  if (tm.tag === 'Unroll') {
    const [term, ty] = synth(ns, ts, vs, k, tm.term);
    const vt = force(ty);
    if (vt.tag === 'VFix') return [Unroll(term), vt.body(ty)];
    return terr(`fix type expected in ${showFromSurface(tm, ns)}: ${showTermU(vt, ns, k)}`);
  }
  if (tm.tag === 'Ann') {
    const type = check(ns, ts, vs, k, tm.type, VType);
    const vt = evaluate(type, vs);
    const term = check(ns, ts, vs, k, tm.term, vt);
    return [term, vt];
  }
  if (tm.tag === 'Ind') {
    let type;
    let vt;
    let term;
    if (tm.type) {
      type = check(ns, ts, vs, k, tm.type, VType);
      vt = evaluate(type, vs);
      term = check(ns, ts, vs, k, tm.term, vt);
    } else {
      const [term_, ty] = synth(ns, ts, vs, k, tm.term);
      type = quote(ty, k, false);
      vt = ty;
      term = term_;
    }
    const fulltype = quote(vt, k, true);
    const ind = makeInduction(fulltype, type, term);
    log(() => showTerm(ind));
    log(() => showFromSurface(ind, ns));
    return [Ind(type, term), evaluate(ind, vs)];
  }
  if (tm.tag === 'IndFix') {
    // inductionFix {f} (x : fix (r : *). f r) :
    // {P : Fix f} -> (((h : Fix f) -> P h) -> (y : f (Fix f)) -> P y) -> P x
    const type = check(ns, ts, vs, k, tm.type, VPi(PlicityR, '_', VType, _ => VType));
    const vt = evaluate(type, vs);
    const fixF = VFix('r', VType, r => vapp(vt, PlicityR, r));
    const term = check(ns, ts, vs, k, tm.term, fixF);
    const vterm = evaluate(term, vs);
    const rtype = VPi(PlicityE, 'P', VPi(PlicityR, '_', fixF, _ => VType), P =>
      VPi(PlicityR, '_',
        VPi(PlicityR, '_',
          VPi(PlicityR, 'h', fixF, h => vapp(P, PlicityR, h)), _ =>
          VPi(PlicityR, 'y', vapp(vt, PlicityR, fixF), y => vapp(P, PlicityR, VRoll(fixF, y)))), _ =>
      vapp(P, PlicityR, vterm)));
    return [IndFix(type, term), rtype];
  }
  return terr(`cannot synth ${showFromSurface(tm, ns)}`);
};

const synthapp = (ns: List<Name>, ts: EnvT, vs: EnvV, k: Ix, ty_: Val, plicity: Plicity, arg: Term): [Val, Term, List<Term>] => {
  log(() => `synthapp before ${showTermU(ty_, ns, k)}`);
  const ty = force(ty_);
  log(() => `synthapp ${showTermU(ty, ns, k)} ${plicity.erased ? '-' : ''}@ ${showFromSurface(arg, ns)} in ${showEnvT(ts, k, false)} and ${showEnvV(vs)}`);
  if (ty.tag === 'VPi' && ty.plicity.erased && !plicity.erased) {
    // {a} -> b @ c (instantiate with meta then b @ c)
    const m = newMeta(ts);
    const vm = evaluate(m, vs);
    const [rt, ft, l] = synthapp(ns, ts, vs, k, ty.body(vm), plicity, arg);
    return [rt, ft, Cons(m, l)];
  }
  if (ty.tag === 'VPi' && eqPlicity(ty.plicity, plicity)) {
    const tm = check(ns, ts, vs, k, arg, ty.type);
    const vm = evaluate(tm, vs);
    return [ty.body(vm), tm, Nil];
  }
  // TODO fix the following
  if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
    const a = freshMetaId();
    const b = freshMetaId();
    const pi = VPi(plicity, '_', VNe(HMeta(a), ty.args), () => VNe(HMeta(b), ty.args));
    unify(ns, k, ty, pi);
    return synthapp(ns, ts, vs, k, pi, plicity, arg);
  }
  return terr(`invalid type or plicity mismatch in synthapp in ${showTermU(ty, ns, k)} ${plicity.erased ? '-' : ''}@ ${showFromSurface(arg, ns)}`);
};

type HoleInfo = [Val, Val, List<Name>, number, EnvV, EnvT];
let holesStack: { [key:string]: HoleInfo }[] = [];
let holes: { [key:string]: HoleInfo } = {};
const holesPush = (): void => {
  const old = holes;
  holesStack.push(holes);
  holes = {};
  for (let k in old) holes[k] = old[k];
};
const holesPop = (): void => {
  const x = holesStack.pop();
  if (!x) return;
  holes = x;
};
const holesDiscard = (): void => { holesStack.pop() };

export const typecheck = (tm: Term): [Term, Val] => {
  // metaReset(); // TODO: fix this
  holes = {};
  const [etm, ty] = synth(Nil, Nil, Nil, 0, tm);
  const ztm = zonk(etm);
  const holeprops = Object.entries(holes);
  if (holeprops.length > 0) {
    const strtype = showTermUZ(ty);
    const strterm = showFromSurfaceZ(ztm);
    const str = holeprops.map(([x, [t, v, ns, k, vs, ts]]) => {
      const all = zipWith(([x, v], [def, ty]) => [x, v, def, ty] as [Name, Val, boolean, Val], zipWith((x, v) => [x, v] as [Name, Val], ns, vs), ts);
      const allstr = toArray(all, ([x, v, b, t]) => `${x} : ${showTermUZ(t, ns, vs, k)}${b ? '' : ` = ${showTermUZ(v, ns, vs, k)}`}`).join('\n');
      return `\n_${x} : ${showTermUZ(v, ns, vs, k)} = ${showTermUZ(t, ns, vs, k)}\nlocal:\n${allstr}\n`;
    }).join('\n');
    return terr(`unsolved holes\ntype: ${strtype}\nterm: ${strterm}\n${str}`);
  }
  // TODO: should type be checked?
  if (isUnsolved(ztm))
    return terr(`elaborated term was unsolved: ${showFromSurfaceZ(ztm)}`);
  return [ztm, ty];
};

export const typecheckDefs = (ds: Def[], allowRedefinition: boolean = false): Name[] => {
  log(() => `typecheckDefs ${ds.map(x => x.name).join(' ')}`);
  const xs: Name[] = [];
  if (!allowRedefinition) {
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      if (d.tag === 'DDef'&& globalGet(d.name))
        return terr(`cannot redefine global ${d.name}`);
    }
  }
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    log(() => `typecheckDefs ${showDef(d)}`);
    if (d.tag === 'DDef') {
      const [tm, ty] = typecheck(d.value);
      log(() => `set ${d.name} = ${showTerm(tm)}`);
      globalSet(d.name, tm, evaluate(tm), ty);
      xs.push(d.name);
    }
  }
  return xs;
};
