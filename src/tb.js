/*!
 * ndev-framework
 * Copyright(c) 2016-2017 Javanile.org
 * MIT Licensed
 */

var fs = require("fs"),
    dirname = require("path").dirname,
    resolve =  require("path").resolve,
    basename = require("path").basename,
    merge = require('object-merge'),
    parse = require('ini').parse,
    unsafe = require('ini').safe,
    mkdir = require('shelljs').mkdir,
    stringify = require('ini').stringify,
    join = require("path").join,
    exec = require("child_process").spawn,
    util = require("./util");

module.exports = {

    /**
     * Run ndev module package.json scripts.
     *
     * @param args
     */
    runTestCase: function (env, file, callback) {
        return this.xboard(env, this.parseTestCase(env, file));
    },

    parseTestCase: function (env, file) {
        return this.cacheTestCase(env, file, this.loadTestCase(env, resolve(file)));
    },

    loadTestCase: function (env, file) {
        var path = dirname(file);
        var code = [ join(__dirname, '../ini/xboard.ini')];

        this.resolveExtends(env, path, file, code);

        var data = {};
        for (var i in code) {
            var raw = fs.readFileSync(code[i], 'utf-8');
            raw = this.resolveAbsolute(dirname(code[i]), raw);
            raw = this.resolveRelative(env, raw);
            raw = this.resolvePolyglot(env, dirname(code[i]), raw);
            data = merge(data, parse(raw));
        }

        this.resolveValues(data);

        return data;
    },

    cacheTestCase: function (env, file, data) {
        if (!fs.existsSync(env.cache)) {
            mkdir('-p', env.cache);
        }

        var dest = join(env.cache, basename(file));
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
        fs.writeFileSync(dest, code);

        return dest;
    },

    resolveExtends: function (env, path, file, code) {
        if (!fs.existsSync(file)) { return; }

        var raw = fs.readFileSync(file, 'utf-8');
        var pattern = /@extends\(([\._a-z0-9\/\\]+)\)/gi
        var extend;

        while (extend = pattern.exec(raw)) {
            extend.file = join(path, extend[1]);
            extend.path = dirname(extend.file);
            this.resolveExtends(env, extend.path, extend.file, code);
        }

        code.push(file);
    },

    resolveAbsolute: function (path, raw) {
        var pattern = /@absolute\(([\._a-z0-9\/\\]+)\)/gi
        var absolute;

        while (absolute = pattern.exec(raw)) {
            absolute.path = join(path, absolute[1]);
            var replace = absolute[0].replace('(', '\\(').replace(')', '\\)');
            raw = raw.replace(new RegExp(replace, "g"), absolute.path);
        }

        return raw;
    },

    resolveRelative: function (env, raw) {
        var pattern = /@relative\(([\._a-z0-9\/\\]+)\)/gi
        var relative;

        while (relative = pattern.exec(raw)) {
            relative.path = join(env.cwd, relative[1]);
            var replace = relative[0].replace('(', '\\(').replace(')', '\\)');
            raw = raw.replace(new RegExp(replace, "g"), relative.path);
        }

        return raw;
    },

    resolvePolyglot: function (env, path, raw) {
        var pattern = /@polyglot\(([\._a-z0-9\/\\]+)\)/gi
        var polyglot;

        while (polyglot = pattern.exec(raw)) {
            polyglot.file = join(path, polyglot[1]);
            var replace = polyglot[0].replace('(', '\\(').replace(')', '\\)');
            var command = 'polyglot ' + this.parsePolyglot(env, path, polyglot.file);
            raw = raw.replace(new RegExp(replace, "g"), command);
        }

        return raw;
    },

    resolveValues: function (data) {
        for (i in data) {
            if (typeof data[i] == 'string' && isNaN(parseInt(data[i]))) {
                data[i] = '"' + data[i] + '"';
            }
        }
    },

    parsePolyglot: function (env, path, file) {
        return this.cachePolyglot(env, path, file, this.loadPolyglot(env, path, file));
    },

    loadPolyglot: function (env, path, file) {
        var code = [ join(__dirname, '../ini/polyglot.ini')];

        this.resolveExtends(env, path, file, code);

        var data = {};
        for (var i in code) {
            var raw = fs.readFileSync(code[i], 'utf-8');
            raw = this.resolveAbsolute(dirname(code[i]), raw);
            raw = this.resolveRelative(env, raw);
            data = merge(data, parse(raw));
        }

        this.resolveValues(data);

        return data;
    },

    cachePolyglot: function (env, path, file, data) {
        if (!fs.existsSync(env.cache)) {
            mkdir('-p', env.cache);
        }

        var dest = join(env.cache, basename(file));
        var code = stringify(data, {whitespace: false});

        // fix string quote bugs
        code = code.replace(/("\\")|(\\"")/g, '"')

        // write cache file
        fs.writeFileSync(dest, code);

        return dest;
    },

    xboard: function (env, input) {
        var xboard = 'xboard';
        var params = [ '@' + input ];

        return this.exec(env, xboard, params);
    },

    exec: function (env, command, params) {
        var wrapper = exec(command, params);

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
