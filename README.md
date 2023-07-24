# preact-es2020-template
A skeleton for un-bundled preact projects.

## Install
_this command will do an `npm install` for you_
```bash
npm run setup
```

## Build
```bash
npm run build
```

## Watch
```bash
npm run watch
```

## Serve
```bash
npm run serve
```

## Vendor
_use after updating dependencies in build/ventor.ts_
```bash
npm run vendor
```

No bundler, pure ES2020 modules loaded directly into the browser.
This doesn't use any special loaders, bundlers, file servers, etc.
Hosting is done via a static file server, you could use any static file server you want, but I chose http-server for this template because it is small and simple.

The one caveat with this project is the vendoring of dependencies.  To add a runtime dependency:
1. open `build/vendor.ts`
1. create an entry in the array at the top
1. specify the dependency package name (the thing you would put in the TS import statement)
1. specify the path within the package that should be copied (the whole folder will be vendored recursively, usually this is a `dist` or `out` folder)
1. specify the path to the index file (relative to the copied folder from previous step) for the package (usually `index.js` or `package-name.js` or `package-name.min.js`)
1. from the root directory of this project run `npm run vendor`

This will generate the runtime import map and embed it into your `index.html` file so the browser can turn `import { ... } from 'my-package'` into a fetch of `./vendor/my-package/dist/index-file.js`.
If you have transitive dependencies, you will need ot add additional lines for each of them.
If a package is importad with a nested path like `import '@namespace/package/path/to/thing'` you will need to include a `packageToVendor` property in the line item that specifies `@namespace/package` as well.
