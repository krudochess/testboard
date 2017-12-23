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
      extname = require('path').extname,
      dirname = require("path").dirname,
      resolve = require("path").resolve,
      exists = require('command-exists').sync,
      spawn = require("child_process").spawn,
      merge = require('object-merge'),
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
    programs: {},

    /**
     *
     */
    testcase: null,

    /**
     *
     */
    participantsList: [],

    /**
     *
     */
    participantsFile: null,

    /**
     *
     */
    participantsCacheDir: null,

    /**
     *
     */
    participantsCacheFile: null,

    /**
     *
     *
     */
    REGEXP_FILE: '[\\.\\-_a-z0-9\\/\\\\ ]+',

    /**
     *
     *
     */
    REGEXP_FEATURE: '[\\.\\-_a-z0-9\\/\\\\]+',

    /**
     *
     *
     */
    REGEXP_CONSTANT: '[_a-z][_a-z0-9]*',

    /**
     *
     *
     */
    REGEXP_PARTICIPANTS: '[^\\(\\)]*',

    /**
     * Run ndev module package.json scripts.
     *
     * @param args
     */
    runTestCase: function (file, callback) {
        this.files = {};
        this.testcase = file;
        this.programs = {};
        this.participantsList = [];
        this.participantsFile = null;
        this.participantsCacheDir = null;
        this.participantsCacheFile = null;

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

        this.resolveDependency(file, deps, 'xboard');

        var data = {};
        for (var i in deps) {
            if (deps.hasOwnProperty(i)) {
                var raw = this.read(deps[i]);
                raw = this.resolveResource(dirname(deps[i]), raw);
                raw = this.resolvePolyglot(dirname(deps[i]), raw);
                raw = this.resolveParticipants(deps[i], raw);
                this.save(deps[i], raw);
                data = merge(data, parse(raw));
            }
        }

        return this.fixValues(data);
    },

    /**
     *
     * @param file
     * @param data
     */
    cacheTestCase: function (file, data) {
        let cacheDir = join(this.env.cache, md5(file));
        let cacheFile = join(cacheDir, basename(file));

        if (!fs.existsSync(cacheDir)) { util.mkdir(cacheDir); }

        // build tourney file
        if (this.participantsCacheFile && '"'+this.participantsCacheFile+'"' === data['/tourneyFile']) {
            util.mkdir(this.participantsCacheDir);
            let data = '-participants {' + this.participantsList.join('\n') + '\n}\n-results ""';
            fs.writeFileSync(this.participantsCacheFile, data);
        }

        let code = stringify(data, {whitespace: false});

        // fix string quote bugs
        code = code.replace(/("\\")|(\\"")/g, '"');

        // fix xboard implicit true properties
        let implicit = ['cp', 'firstXBook', 'secondXBook', 'noGUI'];
        for (let i in implicit) {
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
     * Resolve extends and feature dependencies.
     *
     * @param file
     * @param deps
     */
    resolveDependency: function (file, deps, source) {
        if (!fs.existsSync(file)) { return; }

        let raw = this.read(file);
        let path = dirname(file);
        let info, pattern;

        pattern = new RegExp('^@extends\\((' + this.REGEXP_FILE + ')\\)', 'gmi');
        while (info = pattern.exec(raw)) {
            info.file = join(path, info[1]);
            raw = this.save(file, raw.replace(new RegExp(util.escapeBracket(info[0]), 'g'), ''));
            this.resolveDependency(info.file, deps, source);
        }

        pattern = new RegExp('^@feature\\((' + this.REGEXP_FEATURE + ')\\)', 'gmi');
        while (info = pattern.exec(raw)) {
            info.file = join(__dirname, '../ini/feature', source,  info[1] + '.ini');
            console.log(info.file);
            if (!fs.existsSync(info.file)) {
                util.exitErrorFile('feature-not-found', {
                    feature: info[1],
                });
            }
            raw = this.save(file, raw.replace(new RegExp(util.escapeBracket(info[0]), 'g'), ''));
            this.resolveDependency(info.file, deps, source);
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
        let polyglot, pattern;

        pattern = new RegExp('@polyglot\\((' + this.REGEXP_FILE + ')\\)', 'gi');
        while (polyglot = pattern.exec(raw)) {
            polyglot.file = join(path, polyglot[1]);
            let replace = util.escapeBracket(polyglot[0]);
            let command = 'polyglot ';
            if (extname(polyglot[1]) == '.ini') {
                command += this.parsePolyglot(polyglot.file);
            } else {
                command += this.forgePolyglot(path, polyglot[1]);
            }
            raw = raw.replace(new RegExp(replace, 'g'), command);
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
    resolveParticipants: function (file, raw) {
        let participants, pattern;

        this.participantsFile = file;
        this.participantsCacheDir = join(this.env.cache, md5('(participants):' + file));
        this.participantsCacheFile = join(this.participantsCacheDir, 'tourney.trn');

        pattern = new RegExp('@participants\\((' + this.REGEXP_PARTICIPANTS + ')\\)', 'gim');
        while (participants = pattern.exec(raw)) {
            this.participantsList = [];
            let list = participants[1].trim().replace(/\n/g, ",").split(',');

            for (let i in list) {
                if (list[i]) {
                    this.participantsList.push(list[i].trim());
                }
            }

            let replace = util.escapeBracket(participants[0]);
            raw = raw.replace(new RegExp(replace, 'gim'), '');
            raw += '\n/tourneyFile=' + this.participantsCacheFile + '\n';
        }

        return raw;
    },

    /**
     *
     * @param data
     */
    fixValues: function (data) {
        for (let i in data) {
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
        let data = {};
        let deps = [join(__dirname, '../ini/polyglot.ini')];

        this.resolveDependency(file, deps, 'polyglot');

        for (let i in deps) {
            let raw = this.read(deps[i]);
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
        let cacheDir = join(this.env.cache, md5(file));
        let cacheFile = join(cacheDir, basename(file));

        if (!fs.existsSync(cacheDir)) { util.mkdir(cacheDir); }

        var code = stringify(data, {whitespace: false});

        // fix string quote bugs
        code = code.replace(/("\\")|(\\"")/g, '"')

        // write cache file
        fs.writeFileSync(cacheFile, code);

        return cacheFile;
    },

    /**
     *
     * @param command
     */
    resolveProgram: function (command) {
        var program = command.split(' ');

        if (!exists(program)) {
            util.exitErrorFile('program-not-found', {
                program: program,
                testcase: this.testcase
            });
        }

        return command;
    },

    /*
     * Cache polyglot parsed file.
     *
     * @param file
     * @param data
     */
    forgePolyglot: function (path, file) {
        let cacheDir = join(this.env.cache, md5('(forge)' + path + '/' + file));
        let cacheFile = join(cacheDir, 'polyglot.ini');
        let forgeFile = join(__dirname, '../ini/template/forge-polyglot.ini');

        if (!fs.existsSync(cacheDir)) { util.mkdir(cacheDir); }

        let code = fs.readFileSync(forgeFile, 'utf-8');

        code = code.replace('{{file}}', file);
        code = code.replace('{{log}}', join(path, file + ".log"));

        fs.writeFileSync(cacheFile, code);

        return cacheFile;
    },

    /**
     *
     */
    resolveConstant: function (file, raw) {
        let info, pattern;

        pattern = new RegExp('@constant\\((' + this.REGEXP_CONSTANT + ')\\)', 'gi');
        while (info = pattern.exec(raw)) {
            var value = '';
            switch (info[1]) {
                case 'FILENAME': value = file; break;
            }
            raw = raw.replace(new RegExp(util.escapeBracket(info[0]), 'g'), value);
        }

        return raw;
    },

    /**
     * Load file and save content in runtime cache.
     *
     * @param file
     * @returns {*}
     */
    read: function (file) {
        if (typeof this.files[file] === 'undefined') {
            let raw = fs.readFileSync(file, 'utf-8');
            raw = this.resolveConstant(file, raw);
            this.save(file, raw);
        }

        return this.files[file];
    },

    /**
     * Update file content in runtime cache.
     *
     * @param file
     * @param data
     * @returns {*}
     */
    save: function (file, data) {
        this.files[file] = data;

        return this.files[file];
    },

    /**
     * Run WinBoard/XBoard task.
     *
     * @param input
     * @returns {*}
     */
    xboard: function (input) {
        let xboard = this.resolveProgram('xboard');
        let params = [ '@' + input ];

        return this.exec(xboard, params);
    },

    /**
     * Run terminal command.
     *
     * @param env
     * @param command
     * @param params
     */
    exec: function (command, params) {
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
            //var code = code.toString();
        });
    }
};
