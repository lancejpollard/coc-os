(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = {
    debug: false,
};
exports.setConfig = (c) => {
    for (let k in c)
        exports.config[k] = c[k];
};
exports.log = (msg) => {
    if (exports.config.debug)
        console.log(msg());
};

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nil = { tag: 'Nil' };
exports.Cons = (head, tail) => ({ tag: 'Cons', head, tail });
exports.listFrom = (a) => a.reduceRight((x, y) => exports.Cons(y, x), exports.Nil);
exports.list = (...a) => exports.listFrom(a);
exports.toString = (l, fn = x => `${x}`) => {
    const r = [];
    let c = l;
    while (c.tag === 'Cons') {
        r.push(fn(c.head));
        c = c.tail;
    }
    return `[${r.join(', ')}]`;
};
exports.filter = (l, fn) => l.tag === 'Cons' ? (fn(l.head) ? exports.Cons(l.head, exports.filter(l.tail, fn)) : exports.filter(l.tail, fn)) : l;
exports.first = (l, fn) => {
    let c = l;
    while (c.tag === 'Cons') {
        if (fn(c.head))
            return c.head;
        c = c.tail;
    }
    return null;
};
exports.each = (l, fn) => {
    let c = l;
    while (c.tag === 'Cons') {
        fn(c.head);
        c = c.tail;
    }
};
exports.length = (l) => {
    let n = 0;
    let c = l;
    while (c.tag === 'Cons') {
        n++;
        c = c.tail;
    }
    return n;
};
exports.reverse = (l) => exports.listFrom(exports.toArray(l, x => x).reverse());
exports.toArray = (l, fn) => {
    let c = l;
    const r = [];
    while (c.tag === 'Cons') {
        r.push(fn(c.head));
        c = c.tail;
    }
    return r;
};
exports.toArrayFilter = (l, m, f) => {
    const a = [];
    while (l.tag === 'Cons') {
        if (f(l.head))
            a.push(m(l.head));
        l = l.tail;
    }
    return a;
};
exports.append = (a, b) => a.tag === 'Cons' ? exports.Cons(a.head, exports.append(a.tail, b)) : b;
exports.consAll = (hs, b) => exports.append(exports.listFrom(hs), b);
exports.map = (l, fn) => l.tag === 'Cons' ? exports.Cons(fn(l.head), exports.map(l.tail, fn)) : l;
exports.index = (l, i) => {
    while (l.tag === 'Cons') {
        if (i-- === 0)
            return l.head;
        l = l.tail;
    }
    return null;
};
exports.extend = (name, val, rest) => exports.Cons([name, val], rest);
exports.lookup = (l, name, eq = (x, y) => x === y) => {
    while (l.tag === 'Cons') {
        const h = l.head;
        if (eq(h[0], name))
            return h[1];
        l = l.tail;
    }
    return null;
};
exports.foldr = (f, i, l) => l.tag === 'Nil' ? i : f(l.head, exports.foldr(f, i, l.tail));
exports.foldl = (f, i, l) => l.tag === 'Nil' ? i : exports.foldl(f, f(i, l.head), l.tail);
exports.zipWith = (f, la, lb) => la.tag === 'Nil' || lb.tag === 'Nil' ? exports.Nil :
    exports.Cons(f(la.head, lb.head), exports.zipWith(f, la.tail, lb.tail));
exports.zipWith_ = (f, la, lb) => {
    if (la.tag === 'Cons' && lb.tag === 'Cons') {
        f(la.head, lb.head);
        exports.zipWith_(f, la.tail, lb.tail);
    }
};
exports.and = (l) => l.tag === 'Nil' ? true : l.head && exports.and(l.tail);
exports.range = (n) => n <= 0 ? exports.Nil : exports.Cons(n - 1, exports.range(n - 1));
exports.contains = (l, v) => l.tag === 'Cons' ? (l.head === v || exports.contains(l.tail, v)) : false;
exports.max = (l) => exports.foldl((a, b) => b > a ? b : a, Number.MIN_SAFE_INTEGER, l);

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nothing = { tag: 'Nothing' };
exports.Just = (val) => ({ tag: 'Just', val });
exports.caseMaybe = (m, f, d) => m.tag === 'Just' ? f(m.val) : d();

},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextName = (x) => {
    const s = x.split('$');
    if (s.length === 2)
        return `${s[0]}\$${+s[1] + 1}`;
    return `${x}\$0`;
};

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./surface/parser");
const config_1 = require("./config");
const syntax_1 = require("./surface/syntax");
const elaborate_1 = require("./surface/elaborate");
const vals_1 = require("./surface/vals");
const env_1 = require("./surface/env");
const help = `
EXAMPLES
identity = \\(t : *) (x : t). x
zero = \\t z s. z : /(t : *) t (/t. t). t

COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:def name term] set a name
[:opq name term] set a name opaquely
[:defs] show all defs
[:del name] delete a name
`.trim();
exports.initREPL = () => {
    env_1.resetEnv();
};
exports.runREPL = (_s, _cb) => {
    _s = _s.trim();
    if (_s === ':help' || _s === ':h')
        return _cb(help);
    if (_s === ':debug' || _s === ':d') {
        config_1.setConfig({ debug: !config_1.config.debug });
        return _cb(`debug: ${config_1.config.debug}`);
    }
    if (_s === ':defs') {
        const e = env_1.getEnvMap();
        const msg = Object.keys(e).map(k => `${e[k].opaque ? 'opaque ' : ''}${k} : ${syntax_1.showTerm(vals_1.quote(e[k].type))} = ${syntax_1.showTerm(vals_1.quote(e[k].val))}`).join('\n');
        return _cb(msg || 'no definitions');
    }
    if (_s.startsWith(':del')) {
        const name = _s.slice(4).trim();
        env_1.delEnv(name);
        return _cb(`deleted ${name}`);
    }
    let name = null;
    let opq = false;
    if (_s.startsWith(':def') || _s.startsWith(':opq')) {
        opq = _s.startsWith(':opq');
        const rest = _s.slice(4).trim();
        name = rest.split(/\s+/)[0].trim();
        _s = rest.slice(name.length).trim();
    }
    let msg = '';
    let tm_;
    let ty_;
    try {
        const t = parser_1.parse(_s);
        config_1.log(() => syntax_1.showTerm(t));
        const [ty, tm] = elaborate_1.elaborate(t);
        tm_ = tm;
        ty_ = ty;
        config_1.log(() => syntax_1.showTerm(ty));
        config_1.log(() => syntax_1.showTerm(tm));
        msg += `type: ${syntax_1.showTerm(ty)}\nterm: ${syntax_1.showTerm(tm)}`;
    }
    catch (err) {
        config_1.log(() => '' + err);
        return _cb('' + err, true);
    }
    try {
        const n = vals_1.normalize(tm_);
        config_1.log(() => syntax_1.showTerm(n));
        msg += '\nnorm: ' + syntax_1.showTerm(n);
        if (name) {
            env_1.setEnv(name, vals_1.evaluate(tm_), vals_1.evaluate(ty_), opq);
            msg += `\ndefined ${name}`;
        }
        return _cb(msg);
    }
    catch (err) {
        config_1.log(() => '' + err);
        msg += '\n' + err;
        return _cb(msg);
    }
};

},{"./config":1,"./surface/elaborate":6,"./surface/env":7,"./surface/parser":9,"./surface/syntax":10,"./surface/vals":12}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("../list");
const vals_1 = require("./vals");
const syntax_1 = require("./syntax");
const metas_1 = require("./metas");
const config_1 = require("../config");
const maybe_1 = require("../maybe");
const util_1 = require("../util");
const unify_1 = require("./unify");
const env_1 = require("./env");
exports.Bound = (type) => ({ bound: true, type });
exports.Def = (type) => ({ bound: false, type });
exports.showEnvT = (l, vs) => list_1.toString(l, ([x, b]) => `${x} :${b.bound ? '' : '='} ${syntax_1.showTerm(vals_1.quote(b.type, vs))}`);
const newMeta = (ts) => {
    const spine = list_1.map(list_1.filter(ts, ([x, { bound }]) => bound && x !== '_'), ([x, _]) => syntax_1.Var(x));
    return list_1.foldr((x, y) => syntax_1.App(y, x), metas_1.freshMeta(), spine);
};
const checkOpenNames = (ns) => {
    ns.forEach(x => {
        const r = env_1.getEnv(x);
        if (!r || !r.opaque)
            util_1.terr(`not a opaque name in open: ${x}`);
    });
};
const check = (ts, vs, tm, ty_) => {
    const ty = vals_1.force(ty_);
    config_1.log(() => `check ${syntax_1.showTerm(tm)} : ${syntax_1.showTerm(vals_1.quote(ty, vs))} in ${exports.showEnvT(ts, vs)} and ${vals_1.showEnvV(vs)}`);
    if (ty.tag === 'VType' && tm.tag === 'Type')
        return syntax_1.Type;
    if (tm.tag === 'Open') {
        checkOpenNames(tm.names);
        return check(ts, vals_1.openV(vs, tm.names), tm.body, ty);
    }
    if (tm.tag === 'Abs' && !tm.type && ty.tag === 'VPi') {
        const x = vals_1.freshName(vs, ty.name);
        const vx = vals_1.VVar(x);
        const body = check(list_1.Cons([tm.name, exports.Bound(ty.type)], ts), vals_1.extendV(vs, tm.name, maybe_1.Just(vx)), tm.body, ty.body(vx));
        return syntax_1.Abs(tm.name, vals_1.quote(ty.type, vs), body);
    }
    if (tm.tag === 'Hole')
        return newMeta(ts);
    if (tm.tag === 'Let') {
        const [vt, val] = synth(ts, vs, tm.val);
        const vv = vals_1.evaluate(val, vs);
        const body = check(list_1.Cons([tm.name, exports.Def(vt)], ts), vals_1.extendV(vs, tm.name, maybe_1.Just(vv)), tm.body, ty);
        return syntax_1.Let(tm.name, val, body);
    }
    const [ty2, term] = synth(ts, vs, tm);
    unify_1.unify(vs, ty2, ty);
    return term;
};
const freshPi = (ts, vs, x) => {
    const a = newMeta(ts);
    const va = vals_1.evaluate(a, vs);
    const b = newMeta(list_1.Cons([x, exports.Bound(va)], ts));
    return vals_1.VPi(x, va, v => vals_1.evaluate(b, vals_1.extendV(vs, x, maybe_1.Just(v))));
};
const freshPiType = (ts, vs, x, va) => {
    const b = newMeta(list_1.Cons([x, exports.Bound(va)], ts));
    return vals_1.VPi(x, va, v => vals_1.evaluate(b, vals_1.extendV(vs, x, maybe_1.Just(v))));
};
const synth = (ts, vs, tm) => {
    config_1.log(() => `synth ${syntax_1.showTerm(tm)} in ${exports.showEnvT(ts, vs)} and ${vals_1.showEnvV(vs)}`);
    if (tm.tag === 'Type')
        return [vals_1.VType, tm];
    if (tm.tag === 'Var') {
        if (tm.name === '_')
            return util_1.terr(`invalid name _`);
        const ty = list_1.lookup(ts, tm.name);
        if (!ty) {
            const r = env_1.getEnv(tm.name);
            if (!r)
                return util_1.terr(`undefined var ${tm.name}`);
            return [r.type, tm];
        }
        return [ty.type, tm];
    }
    if (tm.tag === 'Ann') {
        const type = check(ts, vs, tm.type, vals_1.VType);
        const vt = vals_1.evaluate(type, vs);
        const term = check(ts, vs, tm.term, vt);
        return [vt, term];
    }
    if (tm.tag === 'App') {
        const [fn, fntm] = synth(ts, vs, tm.left);
        const [rt, res] = synthapp(ts, vs, fn, tm.right);
        return [rt, syntax_1.App(fntm, res)];
    }
    if (tm.tag === 'Abs') {
        if (tm.type) {
            const type = check(ts, vs, tm.type, vals_1.VType);
            const vt = vals_1.evaluate(type, vs);
            const pi = freshPiType(ts, vs, tm.name, vt);
            const term = check(ts, vs, syntax_1.Abs(tm.name, null, tm.body), pi);
            return [pi, term];
        }
        else {
            const pi = freshPi(ts, vs, tm.name);
            const term = check(ts, vs, tm, pi);
            return [pi, term];
        }
    }
    if (tm.tag === 'Hole') {
        const t = newMeta(ts);
        const vt = vals_1.evaluate(newMeta(ts), vs);
        return [vt, t];
    }
    if (tm.tag === 'Let') {
        const [vt, val] = synth(ts, vs, tm.val);
        const vv = vals_1.evaluate(val, vs);
        const [tr, body] = synth(list_1.Cons([tm.name, exports.Def(vt)], ts), vals_1.extendV(vs, tm.name, maybe_1.Just(vv)), tm.body);
        return [tr, syntax_1.Let(tm.name, val, body)];
    }
    if (tm.tag === 'Pi') {
        const type = check(ts, vs, tm.type, vals_1.VType);
        const vt = vals_1.evaluate(type, vs);
        const body = check(list_1.Cons([tm.name, exports.Bound(vt)], ts), vals_1.extendV(vs, tm.name, maybe_1.Nothing), tm.body, vals_1.VType);
        return [vals_1.VType, syntax_1.Pi(tm.name, type, body)];
    }
    if (tm.tag === 'Opq') {
        const x = tm.name;
        const r = env_1.getEnv(x);
        if (!r || !r.opaque)
            return util_1.terr(`undefined opaque ${syntax_1.showTerm(tm)}`);
        const tmp = vals_1.extendV(vals_1.emptyEnvV, x, maybe_1.Nothing);
        const xr = vals_1.freshName(tmp, 'r');
        const xf = vals_1.freshName(tmp, 'f');
        return [
            // {r : *} -> {f : typeX -> r} -> f X -> f valX
            vals_1.evaluate(syntax_1.Pi(xr, syntax_1.Type, syntax_1.Pi(xf, syntax_1.Pi('_', vals_1.quote(r.type), syntax_1.Var(xr)), syntax_1.Pi('_', syntax_1.App(syntax_1.Var(xf), syntax_1.Var(x)), syntax_1.App(syntax_1.Var(xf), vals_1.quote(r.val)))))),
            tm,
        ];
    }
    if (tm.tag === 'Open') {
        checkOpenNames(tm.names);
        return synth(ts, vals_1.openV(vs, tm.names), tm.body);
    }
    return util_1.terr(`cannot synth ${syntax_1.showTerm(tm)}`);
};
const synthapp = (ts, vs, ty_, arg) => {
    const ty = vals_1.force(ty_);
    config_1.log(() => `synthapp ${syntax_1.showTerm(vals_1.quote(ty, vs))} @ ${syntax_1.showTerm(arg)} in ${exports.showEnvT(ts, vs)} and ${vals_1.showEnvV(vs)}`);
    if (ty.tag === 'VPi') {
        const tm = check(ts, vs, arg, ty.type);
        const vm = vals_1.evaluate(tm, vs);
        return [ty.body(vm), tm];
    }
    if (ty.tag === 'VNe' && ty.head.tag === 'HMeta') {
        const a = metas_1.freshMetaId();
        const b = metas_1.freshMetaId();
        const pi = vals_1.VPi('_', vals_1.VNe(vals_1.HMeta(a), ty.args), () => vals_1.VNe(vals_1.HMeta(b), ty.args));
        unify_1.unify(vs, ty, pi);
        return synthapp(ts, vs, pi, arg);
    }
    return util_1.terr(`unable to syntapp: ${syntax_1.showTerm(vals_1.quote(ty, vs))} @ ${syntax_1.showTerm(arg)}`);
};
exports.elaborate = (tm, ts = list_1.Nil, vs = vals_1.emptyEnvV) => {
    metas_1.resetMetas();
    const [ty, term] = synth(ts, vs, tm);
    const zty = vals_1.zonk(vs, vals_1.quote(ty, vs));
    config_1.log(() => syntax_1.showTerm(term));
    const zterm = vals_1.zonk(vs, term);
    config_1.log(() => syntax_1.showTerm(zterm));
    if (syntax_1.isUnsolved(zty) || syntax_1.isUnsolved(zterm))
        return util_1.terr(`unsolved type or term: ${syntax_1.showTerm(zterm)} : ${syntax_1.showTerm(zty)}`);
    return [zty, zterm];
};

},{"../config":1,"../list":2,"../maybe":3,"../util":13,"./env":7,"./metas":8,"./syntax":10,"./unify":11,"./vals":12}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let env = {};
exports.resetEnv = () => { env = {}; };
exports.getEnvMap = () => env;
exports.getEnv = (name) => env[name] || null;
exports.setEnv = (name, val, type, opaque = false) => {
    env[name] = { val, type, opaque };
};
exports.delEnv = (name) => {
    delete env[name];
};

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("./syntax");
const util_1 = require("../util");
let metas = [];
exports.resetMetas = () => { metas = []; };
exports.getMeta = (id) => {
    const s = metas[id] || null;
    if (!s)
        return util_1.impossible(`undefined meta ?${id} in getSolvedMeta`);
    return s;
};
exports.setMeta = (id, val) => {
    metas[id] = { tag: 'Solved', val };
};
exports.freshMetaId = () => {
    const id = metas.length;
    metas[id] = { tag: 'Unsolved' };
    return id;
};
exports.freshMeta = () => syntax_1.Meta(exports.freshMetaId());

},{"../util":13,"./syntax":10}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
const syntax_1 = require("./syntax");
const config_1 = require("../config");
const TName = (name) => ({ tag: 'Name', name });
const TList = (list) => ({ tag: 'List', list });
const matchingBracket = (c) => {
    if (c === '(')
        return ')';
    if (c === ')')
        return '(';
    return util_1.serr(`invalid bracket: ${c}`);
};
const SYM1 = ['\\', ':', '/', '.', '*'];
const SYM2 = ['->'];
const START = 0;
const NAME = 1;
const COMMENT = 2;
const tokenize = (sc) => {
    let state = START;
    let r = [];
    let t = '';
    let esc = false;
    let p = [], b = [];
    for (let i = 0, l = sc.length; i <= l; i++) {
        const c = sc[i] || ' ';
        const next = sc[i + 1] || '';
        if (state === START) {
            if (SYM2.indexOf(c + next) >= 0)
                r.push(TName(c + next)), i++;
            else if (SYM1.indexOf(c) >= 0)
                r.push(TName(c));
            else if (c === ';')
                state = COMMENT;
            else if (c === '~')
                t += c, state = NAME;
            else if (/[\_a-z]/i.test(c))
                t += c, state = NAME;
            else if (c === '(')
                b.push(c), p.push(r), r = [];
            else if (c === ')') {
                if (b.length === 0)
                    return util_1.serr(`unmatched bracket: ${c}`);
                const br = b.pop();
                if (matchingBracket(br) !== c)
                    return util_1.serr(`unmatched bracket: ${br} and ${c}`);
                const a = p.pop();
                a.push(TList(r));
                r = a;
            }
            else if (/\s/.test(c))
                continue;
            else
                return util_1.serr(`invalid char ${c} in tokenize`);
        }
        else if (state === NAME) {
            if (!/[a-z0-9\_]/i.test(c)) {
                r.push(TName(t));
                t = '', i--, state = START;
            }
            else
                t += c;
        }
        else if (state === COMMENT) {
            if (c === '\n')
                state = START;
        }
    }
    if (b.length > 0)
        return util_1.serr(`unclosed brackets: ${b.join(' ')}`);
    if (state !== START && state !== COMMENT)
        return util_1.serr('invalid tokenize end state');
    if (esc)
        return util_1.serr(`escape is true after tokenize`);
    return r;
};
/*
TODO:
{ tag: 'Pi', name: Name, type: Term, body: Term } ->
{ tag: 'Let', name: Name, val: Term, body: Term }
*/
const tunit = syntax_1.Var('UnitType');
const unit = syntax_1.Var('Unit');
const isName = (t, x) => t.tag === 'Name' && t.name === x;
const isNames = (t) => t.map(x => {
    if (x.tag !== 'Name')
        return util_1.serr(`expected name`);
    return x.name;
});
const lambdaParams = (t) => {
    if (t.tag === 'Name')
        return [[t.name, null]];
    if (t.tag === 'List') {
        const a = t.list;
        if (a.length === 0)
            return [['_', tunit]];
        const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
        if (i === -1)
            return isNames(a).map(x => [x, null]);
        const ns = a.slice(0, i);
        const rest = a.slice(i + 1);
        const ty = exprs(rest);
        return isNames(ns).map(x => [x, ty]);
    }
    return util_1.serr(`invalid lambda param`);
};
const piParams = (t) => {
    if (t.tag === 'Name')
        return [['_', expr(t)]];
    if (t.tag === 'List') {
        const a = t.list;
        if (a.length === 0)
            return [['_', tunit]];
        const i = a.findIndex(v => v.tag === 'Name' && v.name === ':');
        if (i === -1)
            return [['_', expr(t)]];
        const ns = a.slice(0, i);
        const rest = a.slice(i + 1);
        const ty = exprs(rest);
        return isNames(ns).map(x => [x, ty]);
    }
    return util_1.serr(`invalid pi param`);
};
const expr = (t) => {
    if (t.tag === 'List')
        return exprs(t.list);
    if (t.tag === 'Name') {
        const x = t.name;
        if (x === '*')
            return syntax_1.Type;
        if (x === '_')
            return syntax_1.Hole;
        if (x[0] === '~' && x.length > 1)
            return syntax_1.Opq(x.slice(1));
        if (/[a-z]/i.test(x[0]))
            return syntax_1.Var(x);
        return util_1.serr(`invalid name: ${x}`);
    }
    return t;
};
const exprs = (ts) => {
    if (ts.length === 0)
        return unit;
    if (ts.length === 1)
        return expr(ts[0]);
    const i = ts.findIndex(x => isName(x, ':'));
    if (i >= 0) {
        const a = ts.slice(0, i);
        const b = ts.slice(i + 1);
        return syntax_1.Ann(exprs(a), exprs(b));
    }
    if (isName(ts[0], '\\')) {
        const args = [];
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
        if (!found)
            return util_1.serr(`. not found after \\`);
        const body = exprs(ts.slice(i + 1));
        return args.reduceRight((x, [name, ty]) => syntax_1.Abs(name, ty, x), body);
    }
    if (isName(ts[0], '/')) {
        const args = [];
        let found = false;
        let i = 1;
        for (; i < ts.length; i++) {
            const c = ts[i];
            if (isName(c, '.')) {
                found = true;
                break;
            }
            piParams(c).forEach(a => args.push(a));
        }
        if (!found)
            return util_1.serr(`. not found after /`);
        const body = exprs(ts.slice(i + 1));
        return args.reduceRight((x, [name, ty]) => syntax_1.Pi(name, ty, x), body);
    }
    if (isName(ts[0], 'open')) {
        const args = [];
        let found = false;
        let i = 1;
        for (; i < ts.length; i++) {
            const c = ts[i];
            if (c.tag === 'Name') {
                if (c.name === 'in') {
                    found = true;
                    break;
                }
                else {
                    args.push(c.name);
                    continue;
                }
            }
            return util_1.serr(`invalid name after open`);
        }
        if (!found)
            return util_1.serr(`in not found after open`);
        if (args.length === 0)
            return util_1.serr(`empty open`);
        const body = exprs(ts.slice(i + 1));
        return syntax_1.Open(args, body);
    }
    return ts.map(expr).reduce(syntax_1.App);
};
exports.parse = (s) => {
    const ts = tokenize(s);
    config_1.log(() => ts);
    return exprs(ts);
};

},{"../config":1,"../util":13,"./syntax":10}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Var = (name) => ({ tag: 'Var', name });
exports.App = (left, right) => ({ tag: 'App', left, right });
exports.Abs = (name, type, body) => ({ tag: 'Abs', name, type, body });
exports.Pi = (name, type, body) => ({ tag: 'Pi', name, type, body });
exports.Let = (name, val, body) => ({ tag: 'Let', name, val, body });
exports.Ann = (term, type) => ({ tag: 'Ann', term, type });
exports.Type = { tag: 'Type' };
exports.Hole = { tag: 'Hole' };
exports.Opq = (name) => ({ tag: 'Opq', name });
exports.Open = (names, body) => ({ tag: 'Open', names, body });
exports.Meta = (id) => ({ tag: 'Meta', id });
exports.showTermSimple = (t) => {
    if (t.tag === 'Var')
        return t.name;
    if (t.tag === 'App')
        return `(${exports.showTermSimple(t.left)} ${exports.showTermSimple(t.right)})`;
    if (t.tag === 'Abs')
        return t.type ?
            `(\\(${t.name} : ${exports.showTermSimple(t.type)}). ${exports.showTermSimple(t.body)})` :
            `(\\${t.name}. ${exports.showTermSimple(t.body)})`;
    if (t.tag === 'Pi')
        return `((${t.name} : ${exports.showTermSimple(t.type)}) -> ${exports.showTermSimple(t.body)})`;
    if (t.tag === 'Let')
        return `(let ${t.name} = ${exports.showTermSimple(t.val)} in ${exports.showTermSimple(t.body)})`;
    if (t.tag === 'Ann')
        return `(${exports.showTermSimple(t.term)} : ${exports.showTermSimple(t.type)})`;
    if (t.tag === 'Type')
        return `*`;
    if (t.tag === 'Hole')
        return `_`;
    if (t.tag === 'Opq')
        return `~${t.name}`;
    if (t.tag === 'Open')
        return `(open ${t.names.join(' ')} in ${exports.showTermSimple(t.body)})`;
    if (t.tag === 'Meta')
        return `?${t.id}`;
    return t;
};
exports.flattenApp = (t) => {
    const r = [];
    while (t.tag === 'App') {
        r.push(t.right);
        t = t.left;
    }
    return [t, r.reverse()];
};
exports.flattenAbs = (t) => {
    const r = [];
    while (t.tag === 'Abs') {
        r.push([t.name, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.flattenPi = (t) => {
    const r = [];
    while (t.tag === 'Pi') {
        r.push([t.name, t.type]);
        t = t.body;
    }
    return [r, t];
};
exports.showTermP = (b, t) => b ? `(${exports.showTerm(t)})` : exports.showTerm(t);
exports.showTerm = (t) => {
    if (t.tag === 'Type')
        return '*';
    if (t.tag === 'Hole')
        return '_';
    if (t.tag === 'Var')
        return `${t.name}`;
    if (t.tag === 'Opq')
        return `~${t.name}`;
    if (t.tag === 'Meta')
        return `?${t.id}`;
    if (t.tag === 'App') {
        const [f, as] = exports.flattenApp(t);
        return `${exports.showTermP(f.tag === 'Abs' || f.tag === 'Pi' || f.tag === 'App' || f.tag === 'Let' || f.tag === 'Ann' || f.tag === 'Open', f)} ${as.map((t, i) => `${exports.showTermP(t.tag === 'App' || t.tag === 'Open' || t.tag === 'Ann' || (t.tag === 'Let' && i < as.length - 1) || (t.tag === 'Abs' && i < as.length - 1) || t.tag === 'Pi', t)}`).join(' ')}`;
    }
    if (t.tag === 'Abs') {
        const [as, b] = exports.flattenAbs(t);
        return `\\${as.map(([x, t]) => !t ? x : `(${x} : ${exports.showTermP(t.tag === 'Ann', t)})`).join(' ')}. ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Pi') {
        const [as, b] = exports.flattenPi(t);
        return `${as.map(([x, t]) => x === '_' ? exports.showTermP(t.tag === 'Ann' || t.tag === 'Abs' || t.tag === 'Let' || t.tag === 'Pi' || t.tag === 'Open', t) : `(${x} : ${exports.showTermP(t.tag === 'Ann', t)})`).join(' -> ')} -> ${exports.showTermP(b.tag === 'Ann', b)}`;
    }
    if (t.tag === 'Let')
        return `let ${t.name} = ${exports.showTerm(t.val)} in ${exports.showTermP(t.body.tag === 'Ann', t.body)}`;
    if (t.tag === 'Ann')
        return `${exports.showTerm(t.term)} : ${exports.showTerm(t.type)}`;
    if (t.tag === 'Open')
        return `open ${t.names.join(' ')} in ${exports.showTerm(t.body)}`;
    return t;
};
exports.isUnsolved = (t) => {
    if (t.tag === 'Meta')
        return true;
    if (t.tag === 'Hole')
        return true;
    if (t.tag === 'Type')
        return false;
    if (t.tag === 'Var')
        return false;
    if (t.tag === 'Opq')
        return false;
    if (t.tag === 'App')
        return exports.isUnsolved(t.left) || exports.isUnsolved(t.right);
    if (t.tag === 'Abs') {
        if (t.type && exports.isUnsolved(t.type))
            return true;
        return exports.isUnsolved(t.body);
    }
    if (t.tag === 'Pi')
        return exports.isUnsolved(t.type) || exports.isUnsolved(t.body);
    if (t.tag === 'Let')
        return exports.isUnsolved(t.val) || exports.isUnsolved(t.body);
    if (t.tag === 'Ann')
        return exports.isUnsolved(t.term) || exports.isUnsolved(t.type);
    if (t.tag === 'Open')
        return exports.isUnsolved(t.body);
    return t;
};

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("../list");
const vals_1 = require("./vals");
const util_1 = require("../util");
const syntax_1 = require("./syntax");
const config_1 = require("../config");
const maybe_1 = require("../maybe");
const metas_1 = require("./metas");
const env_1 = require("./env");
const checkSpine = (spine) => list_1.map(spine, v_ => {
    const v = vals_1.force(v_);
    if (v.tag === 'VNe' && v.head.tag === 'HVar')
        return v.head.name;
    return util_1.terr(`not a var in spine`);
});
const checkSolution = (vs, m, spine, tm) => {
    if (tm.tag === 'Var') {
        if (list_1.contains(spine, tm.name))
            return;
        if (env_1.getEnv(tm.name)) {
            if (list_1.lookup(vs.vals, tm.name) !== null)
                return util_1.terr(`cannot solve with ${tm.name}, name is locally shadowed`);
            return;
        }
        return util_1.terr(`scope error ${tm.name}`);
    }
    if (tm.tag === 'App') {
        checkSolution(vs, m, spine, tm.left);
        checkSolution(vs, m, spine, tm.right);
        return;
    }
    if (tm.tag === 'Type')
        return;
    if (tm.tag === 'Meta') {
        if (m === tm.id)
            return util_1.terr(`occurs check failed: ${syntax_1.showTerm(tm)}`);
        return;
    }
    if (tm.tag === 'Abs' && tm.type) {
        checkSolution(vs, m, spine, tm.type);
        checkSolution(vs, m, list_1.Cons(tm.name, spine), tm.body);
        return;
    }
    if (tm.tag === 'Pi') {
        checkSolution(vs, m, spine, tm.type);
        checkSolution(vs, m, list_1.Cons(tm.name, spine), tm.body);
        return;
    }
    if (tm.tag === 'Opq')
        return;
    return util_1.impossible(`checkSolution (?${m}): non-normal term: ${syntax_1.showTerm(tm)}`);
};
const solve = (vs, m, spine, val) => {
    const spinex = checkSpine(spine);
    const rhs = vals_1.quote(val, vs);
    checkSolution(vs, m, spinex, rhs);
    const solution = vals_1.evaluate(list_1.foldl((x, y) => syntax_1.Abs(y, syntax_1.Type, x), rhs, spinex), vals_1.emptyEnvV);
    metas_1.setMeta(m, solution);
};
exports.unify = (vs, a_, b_) => {
    const a = vals_1.force(vals_1.revaluate(vs, a_));
    const b = vals_1.force(vals_1.revaluate(vs, b_));
    config_1.log(() => `unify ${syntax_1.showTerm(vals_1.quote(a, vs))} ~ ${syntax_1.showTerm(vals_1.quote(b, vs))} in ${vals_1.showEnvV(vs)}`);
    if (a.tag === 'VType' && b.tag === 'VType')
        return;
    if (a.tag === 'VOpq' && b.tag === 'VOpq' && a.name === b.name)
        return;
    if (a.tag === 'VAbs' && b.tag === 'VAbs') {
        exports.unify(vs, a.type, b.type);
        const x = vals_1.freshName(vs, a.name);
        const vx = vals_1.VVar(x);
        exports.unify(vals_1.extendV(vs, x, maybe_1.Nothing), a.body(vx), b.body(vx));
        return;
    }
    if (a.tag === 'VPi' && b.tag === 'VPi') {
        exports.unify(vs, a.type, b.type);
        const x = vals_1.freshName(vs, a.name);
        const vx = vals_1.VVar(x);
        exports.unify(vals_1.extendV(vs, x, maybe_1.Nothing), a.body(vx), b.body(vx));
        return;
    }
    if (a.tag === 'VAbs') {
        const x = vals_1.freshName(vs, a.name);
        const vx = vals_1.VVar(x);
        exports.unify(vals_1.extendV(vs, x, maybe_1.Nothing), a.body(vx), vals_1.vapp(b, vx));
        return;
    }
    if (b.tag === 'VAbs') {
        const x = vals_1.freshName(vs, b.name);
        const vx = vals_1.VVar(x);
        exports.unify(vals_1.extendV(vs, x, maybe_1.Nothing), vals_1.vapp(a, vx), b.body(vx));
        return;
    }
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HVar' && b.head.tag === 'HVar' && a.head.name === b.head.name)
        return list_1.zipWith_((x, y) => exports.unify(vs, x, y), a.args, b.args);
    if (a.tag === 'VNe' && b.tag === 'VNe' && a.head.tag === 'HMeta' && b.head.tag === 'HMeta')
        return list_1.length(a.args) > list_1.length(b.args) ?
            solve(vs, a.head.id, a.args, b) :
            solve(vs, b.head.id, b.args, a);
    if (a.tag === 'VNe' && a.head.tag === 'HMeta')
        return solve(vs, a.head.id, a.args, b);
    if (b.tag === 'VNe' && b.head.tag === 'HMeta')
        return solve(vs, b.head.id, b.args, a);
    const ta = vals_1.quote(a, vs);
    const tb = vals_1.quote(b, vs);
    return util_1.terr(`cannot unify: ${syntax_1.showTerm(ta)} ~ ${syntax_1.showTerm(tb)}`);
};

},{"../config":1,"../list":2,"../maybe":3,"../util":13,"./env":7,"./metas":8,"./syntax":10,"./vals":12}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const list_1 = require("../list");
const names_1 = require("../names");
const metas_1 = require("./metas");
const maybe_1 = require("../maybe");
const syntax_1 = require("./syntax");
const util_1 = require("../util");
const env_1 = require("./env");
const config_1 = require("../config");
exports.emptyEnvV = { vals: list_1.Nil, opened: list_1.Nil };
exports.extendV = (vs, name, val) => ({ vals: list_1.Cons([name, val], vs.vals), opened: vs.opened });
exports.openV = (vs, names) => ({ vals: vs.vals, opened: list_1.consAll(names, vs.opened) });
exports.showEnvV = (l) => list_1.toString(l.vals, ([x, b]) => maybe_1.caseMaybe(b, val => `${x} = ${syntax_1.showTerm(exports.quote(val, l))}`, () => x)) +
    ` @ ${list_1.toString(l.opened)}`;
exports.HVar = (name) => ({ tag: 'HVar', name });
exports.HMeta = (id) => ({ tag: 'HMeta', id });
exports.VNe = (head, args = list_1.Nil) => ({ tag: 'VNe', head, args });
exports.VAbs = (name, type, body) => ({ tag: 'VAbs', name, type, body });
exports.VPi = (name, type, body) => ({ tag: 'VPi', name, type, body });
exports.VOpq = (name) => ({ tag: 'VOpq', name });
exports.VType = { tag: 'VType' };
exports.VVar = (name) => exports.VNe(exports.HVar(name));
exports.VMeta = (id) => exports.VNe(exports.HMeta(id));
exports.force = (v) => {
    if (v.tag === 'VNe' && v.head.tag === 'HMeta') {
        const val = metas_1.getMeta(v.head.id);
        if (val.tag === 'Unsolved')
            return v;
        return exports.force(list_1.foldr((x, y) => exports.vapp(y, x), val.val, v.args));
    }
    return v;
};
exports.freshName = (vs, name_) => {
    if (name_ === '_')
        return '_';
    let name = name_;
    while (list_1.lookup(vs.vals, name) !== null || env_1.getEnv(name))
        name = names_1.nextName(name);
    config_1.log(() => `freshName ${name_} -> ${name} in ${exports.showEnvV(vs)}`);
    return name;
};
const vopq = exports.VAbs('x', exports.VType, () => exports.VAbs('y', exports.VType, v => v));
exports.vapp = (a, b) => {
    if (a.tag === 'VAbs')
        return a.body(b);
    if (a.tag === 'VOpq')
        return vopq;
    if (a.tag === 'VNe')
        return exports.VNe(a.head, list_1.Cons(b, a.args));
    return util_1.impossible('vapp');
};
exports.evaluate = (t, vs = exports.emptyEnvV) => {
    if (t.tag === 'Type')
        return exports.VType;
    if (t.tag === 'Var') {
        const v = list_1.lookup(vs.vals, t.name);
        if (!v) {
            const r = env_1.getEnv(t.name);
            if (!r)
                return util_1.impossible(`evaluate ${t.name}`);
            return r.opaque && !list_1.contains(vs.opened, t.name) ? exports.VVar(t.name) : r.val;
        }
        return maybe_1.caseMaybe(v, v => v, () => exports.VVar(t.name));
    }
    if (t.tag === 'App')
        return exports.vapp(exports.evaluate(t.left, vs), exports.evaluate(t.right, vs));
    if (t.tag === 'Abs' && t.type)
        return exports.VAbs(t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, exports.extendV(vs, t.name, maybe_1.Just(v))));
    if (t.tag === 'Pi')
        return exports.VPi(t.name, exports.evaluate(t.type, vs), v => exports.evaluate(t.body, exports.extendV(vs, t.name, maybe_1.Just(v))));
    if (t.tag === 'Let')
        return exports.evaluate(t.body, exports.extendV(vs, t.name, maybe_1.Just(exports.evaluate(t.val, vs))));
    if (t.tag === 'Meta') {
        const s = metas_1.getMeta(t.id);
        return s.tag === 'Solved' ? s.val : exports.VMeta(t.id);
    }
    if (t.tag === 'Opq')
        return exports.VOpq(t.name);
    if (t.tag === 'Open')
        return exports.evaluate(t.body, exports.openV(vs, t.names));
    return util_1.impossible('evaluate');
};
exports.quote = (v_, vs = exports.emptyEnvV) => {
    const v = exports.force(v_);
    if (v.tag === 'VType')
        return syntax_1.Type;
    if (v.tag === 'VNe') {
        const h = v.head;
        return list_1.foldr((x, y) => syntax_1.App(y, exports.quote(x, vs)), h.tag === 'HVar' ? syntax_1.Var(h.name) : syntax_1.Meta(h.id), v.args);
    }
    if (v.tag === 'VAbs') {
        const x = exports.freshName(vs, v.name);
        return syntax_1.Abs(x, exports.quote(v.type, vs), exports.quote(v.body(exports.VVar(x)), exports.extendV(vs, x, maybe_1.Nothing)));
    }
    if (v.tag === 'VPi') {
        const x = exports.freshName(vs, v.name);
        return syntax_1.Pi(x, exports.quote(v.type, vs), exports.quote(v.body(exports.VVar(x)), exports.extendV(vs, x, maybe_1.Nothing)));
    }
    if (v.tag === 'VOpq')
        return syntax_1.Opq(v.name);
    return v;
};
const zonkSpine = (vs, tm) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.getMeta(tm.id);
        if (s.tag === 'Unsolved')
            return [true, exports.zonk(vs, tm)];
        return [false, s.val];
    }
    if (tm.tag === 'App') {
        const spine = zonkSpine(vs, tm.left);
        return spine[0] ?
            [true, syntax_1.App(spine[1], exports.zonk(vs, tm.right))] :
            [false, exports.vapp(spine[1], exports.evaluate(tm.right, vs))];
    }
    return [true, exports.zonk(vs, tm)];
};
exports.zonk = (vs, tm) => {
    if (tm.tag === 'Meta') {
        const s = metas_1.getMeta(tm.id);
        return s.tag === 'Solved' ? exports.quote(s.val, vs) : tm;
    }
    if (tm.tag === 'Pi')
        return syntax_1.Pi(tm.name, exports.zonk(vs, tm.type), exports.zonk(exports.extendV(vs, tm.name, maybe_1.Nothing), tm.body));
    if (tm.tag === 'Abs')
        return syntax_1.Abs(tm.name, tm.type ? exports.zonk(vs, tm.type) : null, exports.zonk(exports.extendV(vs, tm.name, maybe_1.Nothing), tm.body));
    if (tm.tag === 'Let')
        return syntax_1.Let(tm.name, exports.zonk(vs, tm.val), exports.zonk(exports.extendV(vs, tm.name, maybe_1.Nothing), tm.body));
    if (tm.tag === 'Ann')
        return syntax_1.Ann(exports.zonk(vs, tm.term), tm.type);
    if (tm.tag === 'App') {
        const spine = zonkSpine(vs, tm.left);
        return spine[0] ?
            syntax_1.App(spine[1], exports.zonk(vs, tm.right)) :
            exports.quote(exports.vapp(spine[1], exports.evaluate(tm.right, vs)), vs);
    }
    if (tm.tag === 'Open')
        return syntax_1.Open(tm.names, exports.zonk(exports.openV(vs, tm.names), tm.body));
    return tm;
};
// only use this with elaborated terms
exports.normalize = (t, vs = exports.emptyEnvV) => exports.quote(exports.evaluate(t, vs), vs);
exports.revaluate = (vs, v) => exports.evaluate(exports.quote(v, vs), vs);

},{"../config":1,"../list":2,"../maybe":3,"../names":4,"../util":13,"./env":7,"./metas":8,"./syntax":10}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.impossible = (msg) => {
    throw new Error(`impossible: ${msg}`);
};
exports.terr = (msg) => {
    throw new TypeError(msg);
};
exports.serr = (msg) => {
    throw new SyntaxError(msg);
};

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repl_1 = require("./repl");
var hist = [], index = -1;
var input = document.getElementById('input');
var content = document.getElementById('content');
function onresize() {
    content.style.height = window.innerHeight;
}
window.addEventListener('resize', onresize);
onresize();
addResult("REPL");
repl_1.initREPL();
input.focus();
input.onkeydown = function (keyEvent) {
    var val = input.value;
    var txt = (val || '').trim();
    if (keyEvent.keyCode === 13) {
        keyEvent.preventDefault();
        if (txt) {
            hist.push(val);
            index = hist.length;
            input.value = '';
            var div = document.createElement('div');
            div.innerHTML = val;
            div.className = 'line input';
            content.insertBefore(div, input);
            repl_1.runREPL(txt, addResult);
        }
    }
    else if (keyEvent.keyCode === 38 && index > 0) {
        keyEvent.preventDefault();
        input.value = hist[--index];
    }
    else if (keyEvent.keyCode === 40 && index < hist.length - 1) {
        keyEvent.preventDefault();
        input.value = hist[++index];
    }
    else if (keyEvent.keyCode === 40 && keyEvent.ctrlKey && index >= hist.length - 1) {
        index = hist.length;
        input.value = '';
    }
};
function addResult(msg, err) {
    var divout = document.createElement('pre');
    divout.className = 'line output';
    if (err)
        divout.className += ' error';
    divout.innerHTML = '' + msg;
    content.insertBefore(divout, input);
    input.focus();
    content.scrollTop = content.scrollHeight;
    return divout;
}

},{"./repl":5}]},{},[14]);
