'use strict';

module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    var config = {
        srcDir: 'src',
        distDir: 'dist',
        stageDir: 'stage',
        testDir: 'test',
        exampleDir: 'example',
        distName:'manifestor.js',
        // add any additional js/less/html files to build here:
        lessToBuild: ['example/styles/main.less'],
    };

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        config: config,
        headerInfo: '/*\n' +
              ' <%= pkg.name %>\n' +
              ' version: <%= pkg.version %>\n' +
              ' <%= pkg.homepage %>\n' +
              ' Browserified module compilation\n' +
              '*/\n',

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
          stage: {
            options: {
              browserifyOptions: {
                standalone: 'manifestor'
              }
            },
            src: ['src/main.js'],
            dest: '<%= config.stageDir %>/manifestor.js'
          },
          dist: {
            options: {
              browserifyOptions: {
                standalone: 'manifestor'
              }
            },
            src: ['src/main.js'],
            dest: '<%= config.distDir %>/manifestor.js'
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
                tasks: ['smash', 'browserify:stage']
            },
            grunt: {
                files: 'Gruntfile.js',
                tasks: ['less:example', 'browserify:stage']
            },
            less: {
                files: '<%= config.exampleDir %>/styles/**/*.*',
                tasks: ['less:example']
            },
            browserify: {
                files: '<%= config.src %>/scripts/**/*.*',
                tasks: ['browserify:stage']
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
              text: '<%= headerInfo %>'
            },
            files: {
              'stage/manifestor.js': 'stage/manifestor.js'
            }
          },
          dist: {
            options: {
              text: '<%= headerInfo %>'
            },
            files: {
              '<%= config.distDir %>/manifestor.js': '<%= config.distDir %>/manifestor.js',
              '<%= config.distDir %>/manifestor.min.js': '<%= config.distDir %>/manifestor.min.js'
            }
          }
        },
        bump: {
        options: {
          files: ['package.json', '<%= config.distDir %>/*.js'],
          commitFiles: ['package.json', '<%= config.distDir %>/*.js'],
        }
      }
    });

    // Example tasks
    grunt.registerTask('buildExample', [
        'smash', // build custom D3 package
        'browserify:stage', // bundle JS with browserify
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
        'smash', // build custom D3 package
        'browserify:dist', // bundle JS with browserify
        'uglify:dist',     // minify JS files
        'header:dist'
    ]);

    // Task aliases
    grunt.registerTask('build', ['buildDist']);
    grunt.registerTask('serve', ['serveExample']);
    grunt.registerTask('debug', ['serveExample']);
};
