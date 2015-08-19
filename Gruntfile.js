var _ = require('underscore');
'use strict';

module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    var config = {
        srcDir: 'src',
        distDir: 'dist',
        testDir: 'test',
        exampleScriptDir: 'example/scripts/',
        filesToCopy: [
            // for performance we only match one level down: 'test/spec/{,*/}*.js'
            // if you want to recursively match all subfolders: 'test/spec/**/*.js'
            '{,*/}*.{gif,jpeg,jpg,png,webp,gif,ico}',
            '{,*/}*.html',
            'fonts/{,*/}*.*'
        ],
        distName:'manifestor.js',
        // add any additional js/less/html files to build here:
        jsToBuild: ['example/src/scripts/manifestor.js'],
        lessToBuild: ['example/src/styles/main.less'],
        htmlToBuild: ['example/src/index.html']
    };

    // helper functions for munging paths
    var prependPath = function(fileName, path) { return [path, '/', fileName].join(''); };
    var prependSrc = function(fileName) { return prependPath(fileName, config.src); };
    var prependExample =  function(fileName) { return prependPath(fileName, config.example); };
    var builtExtension = function(fileName) {  return fileName.replace(/\.less$/, '.css').replace(/\.jsx$/, '.js'); };

    // some tasks expect object format {'[built file path]': '[source file path]'}
    var makeBuildSrcPathObj = function(fileNames, buildDir) {
        return _.object(fileNames.map(function(fileName) {
            return [prependPath(builtExtension(fileName), buildDir), prependSrc(fileName)];
        }));
    };
    // or {'[built file path]': '[built file path]'} if we've already moved it to build directory
    var makeBuildBuildPathObj = function(fileNames, buildDir) {
        return _.object(fileNames.map(function(fileName) {
            var buildPath = prependPath(builtExtension(fileName), buildDir);
            return [buildPath, buildPath];
        }));
    };

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        config: config,

        // clean out old files from build folders
        clean: {
            example: {
                files: [{
                    dot: true,
                    src: ['<%= config.example %>/manifestor.js']
                }]
            },
            dist: {
                files: [{
                    dot: true,
                    src: ['<%= config.dist %>/*', '!<%= config.dist %>/.git*']
                }]
            }
        },

        // copy static asset files from src/ to build/[Example or dist]
        copy: {
            example: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: config.src,
                        dest: config.example,
                        src: config.filesToCopy
                    }
                ]
            },
            dist: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: config.src,
                        dest: config.buildDist,
                        src: config.filesToCopy
                    }
                ]
            }
        },

        // bundle JS with browserify
        browserify: {
            example: {
                options: {
                    bundleOptions: { debug: true }
                },
                files: makeBuildSrcPathObj(config.jsToBuild, config.example)
            },
            dist: {
                options: {
                },
                files: makeBuildSrcPathObj(config.jsToBuild, config.buildDist)
            }
        },

        // compile LESS to CSS
        less: {
            example: {
                files: makeBuildSrcPathObj(config.lessToBuild, config.buildExample)
            },
            dist: {
                options: {
                    cleancss: true
                },
                files: makeBuildSrcPathObj(config.lessToBuild, config.buildDist)
            }
        },

        // replace placeholder tags in index.html to point to built js/css
        htmlbuild: {
            example: {
                src: config.htmlToBuild.map(prependBuildExample),
                dest: '<%= config.buildExample %>/',
                options: {
                    beautify: true,
                    scripts: { js: config.jsToBuild.map(prependBuildExample).map(builtExtension) },
                    styles: { css: config.lessToBuild.map(prependBuildExample).map(builtExtension) }
                }
            },
            dist: {
                src: config.htmlToBuild.map(prependBuildDist),
                dest: '<%= config.buildDist %>/',
                options: {
                    scripts: { js: config.jsToBuild.map(prependBuildDist).map(builtExtension) },
                    styles: { css: config.lessToBuild.map(prependBuildDist).map(builtExtension) }
                }
            }
        },

        // run uglify on JS to minify it
        uglify: {
            dist: {
                files: makeBuildBuildPathObj(config.jsToBuild, config.buildDist)
            }
        },

        // web server for serving files from build/[Example or dist]
        connect: {
            example: {
                options: {
                    port: '4000',
                    base: config.buildExample
                }
            },
            dist: {
                options: {
                    port: '4000',
                    base: config.buildDist
                }
            }
        },

        // watch files for changes and run appropriate tasks to rebuild build/Example
        watch: {
            grunt: {
                files: 'Gruntfile.js'
            },
            less: {
                files: '<%= config.src %>/styles/**/*.*',
                tasks: ['less:example']
            },
            browserify: {
                files: '<%= config.src %>/scripts/**/*.*',
                tasks: ['browserify:example']
            },
            copy: {
                files: [
                    '<%= config.src %>/{,*/}*.{gif,jpeg,jpg,png,webp,gif,ico}',
                    '<%= config.src %>/fonts/{,*/}*.*'
                ],
                tasks: ['copy:example']
            },
            html: {
                files: '<%= config.src %>/**/*.html',
                tasks: ['buildExample']
            }
        }
    });

    // Example tasks
    grunt.registerTask('buildExample', [
        'clean:example',      // clean old files out of build/Example
        'copy:example',       // copy static asset files from app/ to build/Example
        'browserify:example', // bundle JS with browserify
        'less:example',       // compile LESS to CSS
        'htmlbuild:example'   // replace tags in index.html to point to built js/css
    ]);
    grunt.registerTask('serveExample', [
        'buildExample',    // steps to run before refresh
        'connect:example', // web server for serving files from build/Example
        'watch'            // watch src files for changes and rebuild when necessary
    ]);

    // Distribution tasks
    grunt.registerTask('buildDist', [
        'clean:dist',      // clean old files out of build/dist
        'copy:dist',       // copy static asset files from app/ to build/dist
        'browserify:dist', // bundle JS with browserify
        'less:dist',       // compile LESS to CSS
        'htmlbuild:dist',  // replace tags in index.html to point to built js/css
        'uglify:dist',     // minify JS files
    ]);
    grunt.registerTask('serveDist', [
        'buildDist',
        'connect:example',     // web server for serving files from build/Example
        'watch'            // watch src files for changes and rebuild when necessary
    ]);

    // Task aliases
    grunt.registerTask('build', ['buildDist']);
    grunt.registerTask('serve', ['serveExample']);
    grunt.registerTask('debug', ['serveExample']);
};
