var _ = require('underscore');
'use strict';

module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    var config = {
        src: 'src',
        dist: 'dist',
        buildDev: 'build/dev',
        buildDist: 'build/dist',
        filesToCopy: [
            // for performance we only match one level down: 'test/spec/{,*/}*.js'
            // if you want to recursively match all subfolders: 'test/spec/**/*.js'
            '{,*/}*.{gif,jpeg,jpg,png,webp,gif,ico}',
            '{,*/}*.html',
            'fonts/{,*/}*.*'
        ],
        // add any additional js/less/html files to build here:
        jsToBuild: ['scripts/main.js'],
        lessToBuild: ['styles/main.less'],
        htmlToBuild: ['index.html']
    };

    // helper functions for munging paths
    var prependPath = function(fileName, path) { return [path, '/', fileName].join(''); };
    var prependSrc =       function(fileName) { return prependPath(fileName, config.src); };
    var prependBuildDev =  function(fileName) { return prependPath(fileName, config.buildDev); };
    var prependBuildDist = function(fileName) { return prependPath(fileName, config.buildDist); };
    var builtExtension = function(fileName) {  return fileName.replace(/\.less$/, '.css').replace(/\.jsx$/, '.js') };

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
            dev: {
                files: [{
                    dot: true,
                    src: ['<%= config.buildDev %>/*', '!<%= config.buildDev %>/.git*']
                }]
            },
            dist: {
                files: [{
                    dot: true,
                    src: ['<%= config.buildDist %>/*', '!<%= config.buildDist %>/.git*']
                }]
            }
        },

        // copy static asset files from src/ to build/[dev or dist]
        copy: {
            dev: {
                files: [
                    {
                        expand: true,
                        dot: true,
                        cwd: config.src,
                        dest: config.buildDev,
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
            dev: {
                options: {
                    bundleOptions: { debug: true }
                },
                files: makeBuildSrcPathObj(config.jsToBuild, config.buildDev)
            },
            dist: {
                options: {
                },
                files: makeBuildSrcPathObj(config.jsToBuild, config.buildDist)
            }
        },

        // compile LESS to CSS
        less: {
            dev: {
                files: makeBuildSrcPathObj(config.lessToBuild, config.buildDev)
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
            dev: {
                src: config.htmlToBuild.map(prependBuildDev),
                dest: '<%= config.buildDev %>/',
                options: {
                    beautify: true,
                    scripts: { js: config.jsToBuild.map(prependBuildDev).map(builtExtension) },
                    styles: { css: config.lessToBuild.map(prependBuildDev).map(builtExtension) }
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

        // web server for serving files from build/[dev or dist]
        connect: {
            dev: {
                options: {
                    port: '4000',
                    base: config.buildDev
                }
            },
            dist: {
                options: {
                    port: '4000',
                    base: config.buildDist
                }
            }
        },

        // watch files for changes and run appropriate tasks to rebuild build/dev
        watch: {
            grunt: {
                files: 'Gruntfile.js'
            },
            less: {
                files: '<%= config.src %>/styles/**/*.*',
                tasks: ['less:dev']
            },
            browserify: {
                files: '<%= config.src %>/scripts/**/*.*',
                tasks: ['browserify:dev']
            },
            copy: {
                files: [
                    '<%= config.src %>/{,*/}*.{gif,jpeg,jpg,png,webp,gif,ico}',
                    '<%= config.src %>/fonts/{,*/}*.*'
                ],
                tasks: ['copy:dev']
            },
            html: {
                files: '<%= config.src %>/**/*.html',
                tasks: ['buildDev']
            }
        }
    });

    // Dev tasks
    grunt.registerTask('buildDev', [
        'clean:dev',      // clean old files out of build/dev
        'copy:dev',       // copy static asset files from app/ to build/dev
        'browserify:dev', // bundle JS with browserify
        'less:dev',       // compile LESS to CSS
        'htmlbuild:dev'   // replace tags in index.html to point to built js/css
    ]);
    grunt.registerTask('serveDev', [
        'buildDev',
        'connect:dev',     // web server for serving files from build/dev
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
        'connect:dev',     // web server for serving files from build/dev
        'watch'            // watch src files for changes and rebuild when necessary
    ]);

    // Task aliases
    grunt.registerTask('build', ['buildDist']);
    grunt.registerTask('serve', ['serveDev']);
    grunt.registerTask('debug', ['serveDev']);
};