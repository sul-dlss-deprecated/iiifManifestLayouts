iiif manifest d3 osd layout
==============

A project that does stuff.

## Development

To work on a development build, first install dependencies:

```
npm install
```

Then run the debug server:

```
grunt debug
```

The development build will be created in `build/dev`. NOTE: files in the `build` directory should never be modified, 
as they will be overwritten whenever the grunt task is run. Make all modifications in `src`.

## Building app for distribution

To build a minified version of the app for distribution, run the 'build' grunt task:

```
grunt build
```

The build will be created in `build/dist`.
