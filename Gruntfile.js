var _ = require('underscore');
'use strict';

module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    var config = {
        srcDir: 'src',
        distDir: 'dist',
        testDir: 'test',
        exampleDir: 'example',
        distName:'manifestor.js',
        // add any additional js/less/html files to build here:
        lessToBuild: ['example/styles/main.less'],
    };

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        config: config,

        // clean out old files from build folders
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: ['<%= config.distDir %>/*', '!<%= config.distDir %>/.git*']
                }]
            }
        },

        // bundle JS with browserify
        browserify: {
            dist: {
                options: {
                    browserifyOptions: {
                        standalone: 'manifestor'
                    }
                },
                src: ['src/main.js'],
                dest: 'stage/manifestor.js'
            }
        },

        // compile LESS to CSS
        less: {
            example: {
                options: {
                    cleancss: true
                },
                files: {
                    'example/styles/main.css': [config.lessToBuild]
                }
            }
        },

        // run uglify on JS to minify it
        uglify: {
            dist: {
                files: {
                    'dist/manifestor.min.js': 'dist/manifestor.js'
                }
            }
        },

        // web server for serving files from example
        connect: {
            example : {
                options: {
                    port: '4000'
                }
            }
        },

        // watch files for changes and run appropriate tasks to rebuild build/Example
        watch: {
            js: {
                files: '<%= config.srcDir %>/**/*.*',
                tasks: ['smash', 'browserify:dist']
            },
            grunt: {
                files: 'Gruntfile.js',
                tasks: ['less:example', 'browserify:dist']
            },
            less: {
                files: '<%= config.exampleDir %>/styles/**/*.*',
                tasks: ['less:example']
            },
            browserify: {
                files: '<%= config.src %>/scripts/**/*.*',
                tasks: ['browserify:dist']
            }
        },

        smash: {
          bundle: {
            src: 'src/lib/d3-slim.js',
            dest: 'src/lib/d3-slim-dist.js'
          }
        },
        header: {
          stage: {
            options: {
              text: '/*\n' +
                    ' <%= pkg.name %>\n' +
                    ' <%= pkg.version %>\n' +
                    ' <%= pkg.homepage %>\n' +
                    ' Browserified module compilation\n' +
                    '*/\n'
            },
              files: {
                'stage/manifestor.js': 'stage/manifestor.js'
              }
          }
    }
    });

    // Example tasks
    grunt.registerTask('buildExample', [
        'smash', // build custom D3 package
        'browserify:dist', // bundle JS with browserify
        'header:stage',
        'less:example',       // compile LESS to CSS
    ]);

    grunt.registerTask('serveExample', [
        'buildExample',    // steps to run before refresh
        'connect:example', // web server for serving files from build/Example
        'watch'            // watch src files for changes and rebuild when necessary
    ]);

    // Distribution tasks
    grunt.registerTask('buildDist', [
        'clean:dist',      // clean old files out of build/dist
        'smash', // build custom D3 package
        'browserify:dist', // bundle JS with browserify
        'less:example',       // compile LESS to CSS
        'uglify:dist',     // minify JS files
    ]);

    // Task aliases
    // grunt.registerTask('build', ['buildDist']);
    grunt.registerTask('serve', ['serveExample']);
    grunt.registerTask('debug', ['serveExample']);
};
