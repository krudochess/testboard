/*!
 * TestBoard
 * Copyright(c) 2016-2017 Javanile.org
 * MIT Licensed
 */

const fs = require('fs'),
      os = require('os'),
      md5 = require('md5'),
      parse = require('ini').parse,
      unsafe = require('ini').safe,
      stringify = require('ini').stringify,
      basename = require("path").basename,
      dirname = require("path").dirname,
      resolve = require("path").resolve,
      spawn = require("child_process").spawn,
      merge = require('object-merge'),
      mkdir = require('shelljs').mkdir,
      join = require("path").join,
      util = require("./util");

module.exports = {

    /**
     *
     */
    env: {
        cwd: process.cwd(),
        cache: join(process.cwd(), '.testboard')
    },

    /**
     *
     */
    files: {},

    /**
     *
     */
    REGEXP_FILE: '[\\._a-z0-9\\/\\\\]+',

    /**
     *
     */
    REGEXP_FEATURE: '[\\._a-z0-9\\/\\\\]+',

    /**
     * Run ndev module package.json scripts.
     *
     * @param args
     */
    runTestCase: function (file, callback) {
        return this.xboard(this.parseTestCase(file), callback);
    },

    /**
     * Run ndev module package.json scripts.
     *
     * @param args
     */
    parseTestCase: function (file) {
        return this.cacheTestCase(file, this.loadTestCase(resolve(file)));
    },

    /**
     * Run ndev module package.json scripts.
     *
     * @param args
     */
    loadTestCase: function (file) {
        var deps = [join(__dirname, '../ini/xboard.ini')];

        if (os.platform() === "win32") {
            deps.push(join(__dirname, '../ini/winboard.ini'))
        }

        this.resolveDependency(file, deps);

        var data = {};
        for (var i in deps) {
            var raw = this.read(deps[i]);
            raw = this.resolveResource(dirname(deps[i]), raw);
            raw = this.resolvePolyglot(dirname(deps[i]), raw);
            this.save(deps[i], raw);
            console.log
            data = merge(data, parse(raw));
        }

        return this.fixValues(data);
    },

    /**
     *
     * @param file
     * @param data
     */
    cacheTestCase: function (file, data) {
        var cacheDir = join(this.env.cache, md5(file));
        var cacheFile = join(cacheDir, basename(file));

        if (!fs.existsSync(cacheDir)) { mkdir('-p', cacheDir); }

        var code = stringify(data, {whitespace: false});

        // fix string quote bugs
        code = code.replace(/("\\")|(\\"")/g, '"')

        // fix xboard implicit true properties
        var implicit = ['cp', 'firstXBook', 'secondXBook'];
        for (var i in implicit) {
            code = code.replace(
                new RegExp('/' + implicit[i] + '=true\n', 'g'),
                '/' + implicit[i] + '\n'
            );
        }

        // write cache file
        fs.writeFileSync(cacheFile, code);

        return cacheFile;
    },

    /**
     *
     * @param file
     * @param deps
     */
    resolveDependency: function (file, deps) {
        if (!fs.existsSync(file)) { return; }

        var raw = this.read(file);
        var path = dirname(file);
        var info, pattern;

        pattern = new RegExp('^@extends\\((' + this.REGEXP_FILE + ')\\)', 'gmi');
        while (info = pattern.exec(raw)) {
            info.file = join(path, info[1]);
            console.log('e:', util.escapeBracket(info[0]));
            raw = this.save(file, raw.replace(new RegExp(util.escapeBracket(info[0]), 'g'), ''));
            this.resolveDependency(info.file, deps);
        }

        pattern = new RegExp('^@feature\\((' + this.REGEXP_FEATURE + ')\\)', 'gmi');
        while (info = pattern.exec(raw)) {
            info.file = join(path, info[1].replace());
            raw = this.save(file, raw.replace(new RegExp(util.escapeBracket(info[0]), 'g'), ''));
            this.resolveDependency(info.file, deps);
        }

        deps.push(file);
    },

    /**
     * Resolve work directory relative path.
     *
     * @param raw
     * @returns {*}
     */
    resolveResource: function (path, raw) {
        var info, pattern;

        pattern = new RegExp('@relative\\((' + this.REGEXP_FILE + ')\\)', 'gi');
        while (info = pattern.exec(raw)) {
            info.resource = join(this.env.cwd, info[1]);
            raw = raw.replace(new RegExp(util.escapeBracket(info[0]), 'g'), info.resource);
        }

        pattern = new RegExp('@absolute\\((' + this.REGEXP_FILE + ')\\)', 'gi');
        while (info = pattern.exec(raw)) {
            info.resource = join(path, info[1]);
            raw = raw.replace(new RegExp(util.escapeBracket(info[0]), 'g'), info.resource);
        }

        return raw;
    },

    /**
     * Resolve polyglot resource.
     *
     * @param path
     * @param raw
     * @returns {*}
     */
    resolvePolyglot: function (path, raw) {
        var polyglot, pattern;

        pattern = new RegExp('@polyglot\\((' + this.REGEXP_FILE + ')\\)', 'gi');
        while (polyglot = pattern.exec(raw)) {
            polyglot.file = join(path, polyglot[1]);
            var replace = util.escapeBracket(polyglot[0]);
            var command = 'polyglot ' + this.parsePolyglot(polyglot.file);
            raw = raw.replace(new RegExp(replace, 'g'), command);
        }

        return raw;
    },

    /**
     *
     * @param data
     */
    fixValues: function (data) {
        for (i in data) {
            if (typeof data[i] == 'string' && isNaN(parseInt(data[i]))) {
                data[i] = '"' + data[i] + '"';
            }
        }
        return data;
    },

    /**
     *
     * @param file
     * @returns {*}
     */
    parsePolyglot: function (file) {
        return this.cachePolyglot(file, this.loadPolyglot(resolve(file)));
    },

    /**
     *
     * @param file
     * @returns {{}}
     */
    loadPolyglot: function (file) {
        var deps = [join(__dirname, '../ini/polyglot.ini')];

        this.resolveDependency(file, deps);

        var data = {};
        for (var i in deps) {
            var raw = this.read(deps[i]);
            raw = this.resolveResource(dirname(deps[i]), raw);
            raw = this.save(deps[i], raw);
            data = merge(data, parse(raw));
        }

        return this.fixValues(data);
    },

    /**
     * Cache polyglot parsed file.
     *
     * @param file
     * @param data
     */
    cachePolyglot: function (file, data) {
        var cacheDir = join(this.env.cache, md5(file));
        var cacheFile = join(cacheDir, basename(file));

        if (!fs.existsSync(cacheDir)) { mkdir('-p', cacheDir); }

        var code = stringify(data, {whitespace: false});

        // fix string quote bugs
        code = code.replace(/("\\")|(\\"")/g, '"')

        // write cache file
        fs.writeFileSync(cacheFile, code);

        return cacheFile;
    },

    /**
     * Load file and save content in runtime cache.
     *
     * @param file
     * @returns {*}
     */
    read: function (file) {
        if (typeof this.files[file] == 'undefined') {
            this.save(file, fs.readFileSync(file, 'utf-8'));
        }
        return this.files[file];
    },

    /**
     * Update file content in runtime cache.
     *
     * @param file
     * @returns {*}
     */
    save: function (file, raw) {
        this.files[file] = raw;
        return this.files[file];
    },

    /**
     *
     * @param env
     * @param input
     * @returns {*}
     */
    xboard: function (env, input) {
        var xboard = 'xboard';
        var params = [ '@' + input ];

        return this.exec(env, xboard, params);
    },

    /**
     *
     * @param env
     * @param command
     * @param params
     */
    exec: function (env, command, params) {
        var wrapper = spawn(command, params);

        // Attach stdout handler
        wrapper.stdout.on("data", function (data) {
            process.stdout.write(data.toString());
        });

        // Attach stderr handler
        wrapper.stderr.on("data", function (data) {
            process.stdout.write(data.toString());
        });

        // Attach exit handler
        wrapper.on("exit", function (code) {
            var code = code.toString();
        });
    }
};
