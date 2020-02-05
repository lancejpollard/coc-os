Try it out at https://atennapel.github.io/coc-os

Currently I am working on rewriting everything.

Run CLI REPL:
```
yarn install
yarn start
```

Typecheck file:
```
yarn install
yarn start lib/nat.coc
```

```
TODO:
- check for redefinitions first before typechecking defs
- use meta variables in domain
- unification with meta variables
- inference of holes
- zonking
- automatic insertion of meta variables
- improve type inference of annotated lambdas
- improve impredicative type inference
- solve issue with unnecessary eta-abstractions
```
