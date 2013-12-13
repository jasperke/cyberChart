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
				 '* Copyright(c): <%= grunt.template.today("yyyy") %> Jasper Ke All rights reserved.',
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
					{expand:true, cwd:'<%= LIB_PATH %>jquery', src:'jquery.min.js', dest:'../example/'}
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
		},
		bump: {
			options: {
				files: ['package.json'],
				updateConfigs: [],
				commit: true,
				commitMessage: 'Release v%VERSION%',
				commitFiles: ['package.json'], // '-a' for all files
				createTag: true,
				tagName: 'v%VERSION%',
				tagMessage: 'Version %VERSION%',
				push: false,
				pushTo: 'master',
				gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d' // options to use with '$ git describe'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-bump');

//	grunt.registerTask('dev', ['copy:dev']);
	grunt.registerTask('default', ['copy:dist', 'uglify']);
};