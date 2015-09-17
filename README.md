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

## License
Apache-2.0