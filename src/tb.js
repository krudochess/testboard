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
        return this.xboard(env, this.parse(env, file));
    },

    parse: function (env, file) {
        return this.cache(env, file, this.load(env, resolve(file)));
    },

    load: function (env, file) {
        var path = dirname(file);
        var code = [ join(__dirname, '../ini/base.ini')];

        this.resolveExtends(env, path, file, code);

        var data = {};
        for (var i in code) {
            var raw = fs.readFileSync(code[i], 'utf-8');
            raw = this.resolveAbsolute(dirname(code[i]), raw);

            data = merge(data, parse(raw));
        }

        this.resolveValues(data);

        return data;
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

    resolveValues: function (data) {
        for (i in data) {
            if (typeof data[i] == 'string' && isNaN(parseInt(data[i]))) {
                data[i] = '"' + data[i] + '"';
            }
        }
    },

    sanitize: function (str) {
        return unsafe(str);
    },

    cache: function (env, file, data) {
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

    xboard: function (env, input) {
        var xboard = 'xboard';
        var params = [ '@' + input ];

        //return this.exec(env, xboard, params);
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
