module.exports = function(grunt) {    
    
    this.uglifyOptions = {
		dead_code: true,
		conditionals: true,
		evaluate: true,
		unused: true,
		join_vars: true,
		drop_console: true,
		drop_debugger: true,
		comparisons: true,
		booleans: true,
		loops: true,
		if_return: true
	};
	
	grunt.initConfig({
        cssmin: {
			dist: {
				files: {
					"dist/rangeslide.min.css": [
						"dist/rangeslide.css"
					]
				}
			}
		},
		concat: {
			js: {
				src: [
					"src/main.js"
				],
				dest: "dist/rangeslide.js"
			},
            css: {
				src: [
					"src/main.css"
				],
				dest: "dist/rangeslide.css"
			}
		},
		umd: {
            dist: {
                options: {
                    src: "dist/rangeslide.js",
                    dest: "dist/rangeslide.js",
                    globalAlias: "rangeslide",
                    deps: {}
                }
            }
        },
        uglify: {
            dist: {
                files: [{
                    "dist/rangeslide.min.js": ["dist/rangeslide.js"]
                }],
                compress: this.uglifyOptions
            }
        },
        
        _clean: {
            build: {
                src: ["dist/"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-contrib-cssmin");
	grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-umd");
    grunt.renameTask("clean", "_clean");

    var cleanTask = ["_clean"];
    var buildTask = ["_clean", "concat", "cssmin", "umd", "uglify"];
    
    grunt.registerTask("default", buildTask);
    grunt.registerTask("clean", cleanTask);
    grunt.registerTask("build", buildTask);
};