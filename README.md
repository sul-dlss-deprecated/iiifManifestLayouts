# iiifManifestLayouts

## Installation for development

Clone the repository
```sh
git clone https://github.com/sul-dlss/iiifManifestLayouts.git
```

Install dependencies
```sh
npm install
```

Run development server
```sh
grunt serve
```

Now you can view the example at [http://127.0.0.1:4000/example/](http://127.0.0.1:4000/example/)

## Building a release

While running `grunt serve`, an updated version of the module can be found locally in `./stage`. To build the package for a release, do the following:


```sh
# Will put a freshly built copy of the library in ./dist
grunt build
```

Bump the version using [grunt-bump](https://github.com/vojtajina/grunt-bump#usage-examples)

** IMPORTANT ** This command will do the following:

 - bump the version in `package.json` and `dist/*.js`
 - Commit the version bumps
 - Tag Commit
 - Push commit and tag up to origin
 
** This should only be run on master, AFTER pull requests have been merged and a new `dist` version has been built **

```sh
# Use --dry-run switch to see what it does
grunt bump
```

## License
Apache-2.0