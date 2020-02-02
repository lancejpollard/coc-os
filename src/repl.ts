import { log, setConfig, config } from './config';
import { globalReset, globalMap, globalDelete } from './surface/globalenv';
import { showTerm } from './syntax';
import { quote, normalize } from './surface/domain';
import { fromSurface, toSurface } from './surface/syntax';
import { parseDefs, parse } from './parser';
import { typecheckDefs, typecheck } from './surface/typecheck';
import { toSurfaceDefs } from './surface/definitions';
import { erase, showTerm as showTermE } from './untyped/syntax';
import { Nil } from './list';
import { toCore } from './core/syntax';

const help = `
EXAMPLES
identity = \\{t : *} (x : t). x
zero = \\t z s. z : {t : *} -> t -> (t -> t) -> t

COMMANDS
[:help or :h] this help message
[:debug or :d] toggle debug log messages
[:def definitions] define names
[:defs] show all defs
[:import files] import a file
[:view files] view a file
[:t term] or [:type term] show the type of an expressions
[:del name] delete a name
`.trim();

const loadFile = (fn: string): Promise<string> => {
  if (typeof window === 'undefined') {
    return new Promise((resolve, reject) => {
      require('fs').readFile(fn, 'utf8', (err: Error, data: string) => {
        if (err) return reject(err);
        return resolve(data);
      });
    });
  } else {
    return fetch(fn).then(r => r.text());
  }
};

export const initREPL = () => {
  globalReset();
};

export const runREPL = (_s: string, _cb: (msg: string, err?: boolean) => void) => {
  try {
    _s = _s.trim();
    if (_s === ':help' || _s === ':h')
      return _cb(help);
    if (_s === ':debug' || _s === ':d') {
      setConfig({ debug: !config.debug });
      return _cb(`debug: ${config.debug}`);
    }
    if (_s === ':defs') {
      const e = globalMap();
      const msg = Object.keys(e).map(k => `def ${k} : ${showTerm(fromSurface(quote(e[k].type, 0, true)))} = ${showTerm(fromSurface(quote(e[k].type, 0, true)))}`).join('\n');
      return _cb(msg || 'no definitions');
    }
    if (_s.startsWith(':del')) {
      const name = _s.slice(4).trim();
      globalDelete(name);
      return _cb(`deleted ${name}`);
    }
    if (_s.startsWith(':def')) {
      const rest = _s.slice(1);
      const ds = parseDefs(rest);
      const dsc = toSurfaceDefs(ds)
      const xs = typecheckDefs(dsc);
      return _cb(`defined ${xs.join(' ')}`);
    }
    if (_s.startsWith(':import')) {
      const files = _s.slice(7).trim().split(/\s+/g);
      Promise.all(files.map(loadFile)).then(defs => {
        const xs: string[] = [];
        defs.forEach(rest => {
          const ds = parseDefs(rest);
          const dsc = toSurfaceDefs(ds)
          const lxs = typecheckDefs(dsc);
          lxs.forEach(x => xs.push(x));
        });
        return _cb(`imported ${files.join(' ')}; defined ${xs.join(' ')}`);
      }).catch(err => _cb(''+err, true));
      return;
    }
    if (_s.startsWith(':view')) {
      const files = _s.slice(5).trim().split(/\s+/g);
      Promise.all(files.map(loadFile)).then(ds => {
        return _cb(ds.join('\n\n'));
      }).catch(err => _cb(''+err, true));
      return;
    }
    let typeOnly = false;
    if (_s.startsWith(':t')) {
      _s = _s.slice(_s.startsWith(':type') ? 5 : 2);
      typeOnly = true;
    } else if (_s.startsWith(':')) return _cb('invalid command', true);
    let msg = '';
    let tm_;
    try {
      const t = parse(_s);
      log(() => showTerm(t));
      const tt = toSurface(t);
      const ty = typecheck(tt);
      tm_ = tt;
      log(() => showTerm(fromSurface(ty)));
      log(() => showTerm(fromSurface(tt)));
      const eras = erase(toCore(normalize(tt, Nil, 0, true)));
      log(() => showTermE(eras));
      msg += `type: ${showTerm(fromSurface(ty))}\nterm: ${showTerm(fromSurface(tt))}\neras: ${showTermE(eras)}`;
      if (typeOnly) return _cb(msg);
    } catch (err) {
      log(() => ''+err);
      return _cb(''+err, true);
    }
    try {
      const n = normalize(tm_, Nil, 0, true);
      log(() => showTerm(fromSurface(n)));
      const er = erase(toCore(normalize(n, Nil, 0, true)));
      log(() => showTermE(er));
      msg += `\nnorm: ${showTerm(fromSurface(n))}\neran: ${showTermE(er)}`;
      return _cb(msg);
    } catch (err) {
      log(() => ''+err);
      msg += '\n'+err;
      return _cb(msg, true);
    }
  } catch (err) {
    log(() => ''+err);
    return _cb(err, true);
  }
};
