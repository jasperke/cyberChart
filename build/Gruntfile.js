//'use strict';

module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		LIB_PATH: './bower_components/',
		banner: [
				 '/*',
				 '* Project: <%= pkg.name %>',
				 '* Version: <%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd HH:MM") %>)',
				 '* Development By: <%= pkg.author %>',
				 '* Copyright(c): <%= grunt.template.today("yyyy") %>',
				 '*/',
				 ''
		],
		uglify: {
			options: {
				banner: '<%= banner.join("\\n") %>'
			},
			dist: {
				files: {
					'../CyberChart.min.js': ['../CyberChart.js']
				}
			}
		},
		copy: {
			dist: {
				files: [
					{expand:true, cwd:'<%= LIB_PATH %>jquery', src:'jquery.min.js', dest:'../'}
				]
			},
			dev: {
				files: [
					{src:'../CyberChart.js', dest:'../CyberChart.min.js'}
				]
			}
		},
		watch: {
			scripts: {
				files: ['../CyberChart.js'],
				tasks: ['copy:dev'],
				options: {
					spawn: true,
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');

//	grunt.registerTask('dev', ['copy:dev']);
	grunt.registerTask('default', ['copy:dist', 'uglify']);
};