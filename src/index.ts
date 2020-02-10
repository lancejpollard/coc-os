// @ts-ignore
import { Pi, Type, Abs, Var, App, Fix, Roll, showTerm, Term, Global, toCore } from './core/syntax';
import * as U from './untyped/syntax';
import * as UD from './untyped/domain';
import * as S from './syntax';
import * as SS from './surface/syntax';
import { typecheck } from './core/typecheck';
import { typecheck as typecheckS } from './surface/typecheck';
import { normalize as normalizeS, quote as quoteS } from './surface/domain';
import { Nil } from './list';
// @ts-ignore
import { normalize, evaluate, quote } from './core/domain';
// @ts-ignore
import { globalSet, globalReset } from './core/globalenv';
import { parse } from './parser';

const E = S.PlicityE;
const R = S.PlicityR;

// @ts-ignore
const tid = Pi(E, Type, Pi(R, Var(0), Var(1)));
// @ts-ignore
const id = Abs(E, Type, Abs(R, Var(0), Var(0)));
// @ts-ignore
const N = (n: number): Term => { let x = Global('Z'); for (let i = 0; i < n; i++) x = App(Global('S'), R, x); return x };
// @ts-ignore
const SN = (n: number): Term => { let x = Global('SZ'); for (let i = 0; i < n; i++) x = App(Global('SS'), R, x); return x };

globalReset();

const tm1 = parse('let {Nat} = {t : *} -> t -> (t -> t) -> t in \\(n : Nat) {t : *} (z : t) (s : t -> t). s (n {t} z s)');
console.log(S.showTerm(tm1));
const tm2 = SS.toSurface(tm1);
console.log(SS.showTerm(tm2));
console.log(S.showTerm(SS.fromSurface(tm2)));
console.log('surface types:');
const [etm, styx] = typecheckS(tm2);
const sty = quoteS(styx, 0, false);
console.log(SS.showTerm(sty));
console.log(S.showTerm(SS.fromSurface(sty)));
const sty2 = normalizeS(sty, Nil, 0, true);
console.log(SS.showTerm(sty2));
console.log(S.showTerm(SS.fromSurface(sty2)));
console.log('surface normalized:');
const snorm = normalizeS(etm, Nil, 0, false);
console.log(SS.showTerm(snorm));
console.log(S.showTerm(SS.fromSurface(snorm)));
const snorm2 = normalizeS(etm, Nil, 0, true);
console.log(SS.showTerm(snorm2));
console.log(S.showTerm(SS.fromSurface(snorm2)));
console.log('core:');
const tm = toCore(etm);
console.log(showTerm(tm));
console.log('types:');
const vty = typecheck(tm);
const ty = quote(vty, 0, false);
console.log(showTerm(ty));
const ty2 = normalize(ty, Nil, 0, true);
console.log(showTerm(ty2));
console.log('normalized:');
const norm = normalize(tm, Nil, 0, false);
console.log(showTerm(norm));
const norm2 = normalize(tm, Nil, 0, true);
console.log(showTerm(norm2));
console.log('erased:');
const erased = U.erase(norm2);
console.log(U.showTerm(erased));
const erasedn = UD.normalize(erased, Nil, 0);
console.log(U.showTerm(erasedn));
