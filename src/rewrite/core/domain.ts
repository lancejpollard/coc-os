import { Ix } from '../../names';
import { List, Cons, Nil, toString, index, foldr } from '../../list';
import { Term, showTerm, Type, Var, App, Abs, Pi, Fix, Roll, Unroll } from './syntax';
import { impossible } from '../../util';

export type Head = HVar;

export type HVar = { tag: 'HVar', index: Ix };
export const HVar = (index: Ix): HVar => ({ tag: 'HVar', index });

export type Elim = EApp | EUnroll

export type EApp = { tag: 'EApp', arg: Val };
export const EApp = (arg: Val): EApp => ({ tag: 'EApp', arg });
export type EUnroll = { tag: 'EUnroll' };
export const EUnroll: EUnroll = { tag: 'EUnroll' };

export type Clos = (val: Val) => Val;
export type Val = VNe | VAbs | VRoll | VPi | VFix | VType;

export type VNe = { tag: 'VNe', head: Head, args: List<Elim> };
export const VNe = (head: Head, args: List<Elim>): VNe => ({ tag: 'VNe', head, args });
export type VAbs = { tag: 'VAbs', type: Val, body: Clos };
export const VAbs = (type: Val, body: Clos): VAbs => ({ tag: 'VAbs', type, body});
export type VRoll = { tag: 'VRoll', type: Val, term: Val };
export const VRoll = (type: Val, term: Val): VRoll => ({ tag: 'VRoll', type, term });
export type VPi = { tag: 'VPi', type: Val, body: Clos };
export const VPi = (type: Val, body: Clos): VPi => ({ tag: 'VPi', type, body});
export type VFix = { tag: 'VFix', type: Val, body: Clos };
export const VFix = (type: Val, body: Clos): VFix => ({ tag: 'VFix', type, body});
export type VType = { tag: 'VType' };
export const VType: VType = { tag: 'VType' };

export const VVar = (index: Ix): VNe => VNe(HVar(index), Nil);

export type EnvV = List<Val>;
export const extendV = (vs: EnvV, val: Val): EnvV => Cons(val, vs);
export const showEnvV = (l: EnvV, k: Ix = 0): string => toString(l, v => showTerm(quote(v, k)));

export const vapp = (a: Val, b: Val): Val => {
  if (a.tag === 'VAbs') return a.body(b);
  if (a.tag === 'VNe') return VNe(a.head, Cons(EApp(b), a.args));
  return impossible(`vapp: ${a.tag}`);
};
export const vunroll = (v: Val): Val => {
  if (v.tag === 'VRoll') return v.term;
  if (v.tag === 'VNe') return VNe(v.head, Cons(EUnroll, v.args));
  return impossible(`vunroll: ${v.tag}`);
};
export const evaluate = (t: Term, vs: EnvV): Val => {
  if (t.tag === 'Type') return VType;
  if (t.tag === 'Var')
    return index(vs, t.index) || impossible(`evaluate ${t.index}`);
  if (t.tag === 'App')
    return vapp(evaluate(t.left, vs), evaluate(t.right, vs));
  if (t.tag === 'Abs')
    return VAbs(evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Let')
    return evaluate(t.body, extendV(vs, evaluate(t.val, vs)));
  if (t.tag === 'Roll')
    return VRoll(evaluate(t.type, vs), evaluate(t.term, vs));
  if (t.tag === 'Unroll')
    return vunroll(evaluate(t.term, vs));
  if (t.tag === 'Pi')
    return VPi(evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  if (t.tag === 'Fix')
    return VFix(evaluate(t.type, vs), v => evaluate(t.body, extendV(vs, v)));
  return t;
};

const quoteHead = (h: Head, k: Ix): Term => {
  if (h.tag === 'HVar') return Var(k - (h.index + 1));
  return h.tag;
};
const quoteElim = (t: Term, e: Elim, k: Ix): Term => {
  if (e.tag === 'EApp') return App(t, quote(e.arg, k));
  if (e.tag === 'EUnroll') return Unroll(t);
  return e;
};
export const quote = (v: Val, k: Ix): Term => {
  if (v.tag === 'VType') return Type;
  if (v.tag === 'VNe')
    return foldr(
      (x, y) => quoteElim(y, x, k),
      quoteHead(v.head, k),
      v.args,
    );
  if (v.tag === 'VAbs')
    return Abs(quote(v.type, k), quote(v.body(VVar(k)), k + 1));
  if (v.tag === 'VPi')
    return Pi(quote(v.type, k), quote(v.body(VVar(k)), k + 1));
  if (v.tag === 'VFix')
    return Fix(quote(v.type, k), quote(v.body(VVar(k)), k + 1));
  if (v.tag === 'VRoll')
    return Roll(quote(v.type, k), quote(v.term, k));
  return v;
};

export const normalize = (t: Term, vs: EnvV, k: Ix): Term =>
  quote(evaluate(t, vs), k);
