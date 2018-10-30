/*!
 * TestBoard
 * Copyright(c) 2016-2017 Javanile.org
 * MIT Licensed
 */

const fs = require('fs')
    , os = require('os')
    , md5 = require('md5')
    , parse = require('ini').parse
    , unsafe = require('ini').safe
    , stringify = require('ini').stringify
    , basename = require("path").basename
    , extname = require('path').extname
    , dirname = require("path").dirname
    , resolve = require("path").resolve
    , exists = require('command-exists').sync
    , spawn = require("child_process").spawn
    , merge = require('object-merge')
    , join = require("path").join
    , util = require("./util")
    , bnf = require('./bnf');

module.exports = {

    /**
     *
     */
    env: {
        cwd: process.cwd(),
        cache: join(process.cwd(), '.tb')
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
    asserts: [],

    /**
     *
     */
    currentTestCase: null,

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
     */
    lastParseIsTestCase: false,

    /**
     *
     */
    runSingleTestCase: true,

    /**
     * Count numner of test case.
     */
    runnedTestCase: 0,

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
    REGEXP_ASSERT: '[ \\.a-z0-9]*',

    /**
     *
     *
     */
    REGEXP_PARTICIPANTS: '[^\\(\\)]*',

    /**
     * Run test case.
     *
     * @param args
     */
    runTestCase: function (file, callback) {
        this.files = {};
        this.currentTestCase = file;
        this.programs = {};
        this.asserts = [];
        this.participantsList = [];
        this.participantsFile = null;
        this.participantsCacheDir = null;
        this.participantsCacheFile = null;

        let test = this.parseTestCase(file)

        if (this.lastParseIsTestCase) {
            this.runnedTestCase++
            util.info(`#${this.runnedTestCase} '${file}' run...`);
            //this.xboard(test, callback);

            let scope = { a: 10 };
            for (let i in this.asserts) {
                console.log('assert:', this.asserts[i]);
                let result = bnf.assert(this.asserts[i], scope)
                console.log('result:', result);
            }

            console.log(this.asserts);

            return
        }

        if (this.runSingleTestCase) {
            util.err(`Wrong test case '${file}' use '@feature(test)' directive.`);
        }
    },

    /**
     * Parse file than store in cache.
     *
     * @param args
     */
    parseTestCase: function (file) {
        this.lastParseIsTestCase = false
        let data = this.loadTestCase(resolve(file));
        if (typeof data['__IS_TEST__'] == 'undefined') { return }
        this.lastParseIsTestCase = true;
        delete data['__IS_TEST__']
        return this.cacheTestCase(file, data);
    },

    /**
     * Load file data and resolve dependencies.
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
                raw = this.loadAsserts(deps[i], raw);
                raw = this.resolveResource(dirname(deps[i]), raw);
                raw = this.resolvePolyglot(dirname(deps[i]), raw);
                raw = this.resolveParticipants(deps[i], raw);
                this.save(deps[i], raw);
                data = merge(data, parse(raw));
            }
        }

        return this.resolveVariables(this.fixValues(data));
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

        let patternExtends = new RegExp('^@extends\\((' + this.REGEXP_FILE + ')\\)', 'gmi');
        let infoExtendsAll = util.matchAll(patternExtends, raw);
        for (let i = 0; i < infoExtendsAll.length; i++) {
            let infoExtendsFile = join(path, infoExtendsAll[i][1]);
            raw = this.save(file, raw.replace(new RegExp(util.escapeBracket(infoExtendsAll[i][0]), 'g'), ''));
            this.resolveDependency(infoExtendsFile, deps, source);
        }

        let patternFeature = new RegExp('^@feature\\((' + this.REGEXP_FEATURE + ')\\)', 'gmi');
        let infoFeatureAll = util.matchAll(patternFeature, raw);
        for (let i = 0; i < infoFeatureAll.length; i++) {
            let infoFeatureFile = join(__dirname, '../ini/feature', source, infoFeatureAll[i][1] + '.ini');
            if (!fs.existsSync(infoFeatureFile)) {
                util.exitErrorFile('feature-not-found', {
                    feature: infoFeatureAll[i][1],
                });
            }
            raw = this.save(file, raw.replace(new RegExp(util.escapeBracket(infoFeatureAll[i][0]), 'g'), ''));
            this.resolveDependency(infoFeatureFile, deps, source);
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
    resolveVariables: function (data) {
        for (let key in data) {
            if (typeof data[key] != 'string' || !data[key].match(new RegExp('\\$[a-z_][a-z0-9_]*', 'gi'))) {
                continue;
            }
            console.log(key + ':', data[key]);

            process.exit();
       }
    },

    /**
     * Resolve polyglot resource.
     *
     * @param path
     * @param raw
     * @returns {*}
     */
    loadAsserts: function (path, raw) {
        let patternAssert = new RegExp('@assert\\((' + this.REGEXP_ASSERT + ')\\)', 'gmi');
        let infoAssertAll = util.matchAll(patternAssert, raw)

        for (let i = 0; i < infoAssertAll.length; i++) {
            try {
                bnf.verify(infoAssertAll[i][1])
            } catch (ex) {
                util.err(`Assert syntax error on '${path}'`)
                console.log(ex.message.split("\n").slice(1).join("\n"))
                process.exit(2);
            }
            this.asserts.push(infoAssertAll[i][1])
            raw = raw.replace(new RegExp(util.escapeBracket(infoAssertAll[i][0]), 'g'), '');
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
        let program = command.split(' ');

        if (!exists(program)) {
            util.exitErrorFile('program-not-found', {
                program: program,
                testcase: this.currentTestCase
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
     * Resolve constants into file contents.
     */
    resolveConstant: function (file, raw) {
        let patternConstant = new RegExp('@constant\\((' + this.REGEXP_CONSTANT + ')\\)', 'gi');
        let infoConstantAll = util.matchAll(patternConstant, raw)

        for (let i = 0; i < infoConstantAll.length; i++) {
            let value = '';
            switch (infoConstantAll[i][1]) {
                case 'FILENAME': value = file; break;
            }
            raw = raw.replace(new RegExp(util.escapeBracket(infoConstantAll[i][0]), 'g'), value);
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
     * Run WinBoard/XBoard program.
     *
     * @param input
     * @returns {*}
     */
    xboard: function (input, cb) {
        let xboard = this.resolveProgram('xboard');
        return this.spawn(xboard, [ '@' + input ], cb);
    },

    /**
     * Run program into terminal.
     *
     * @param env
     * @param command
     * @param params
     */
    spawn: function (program, args, cb) {
        let proc = spawn(program, args);

        // Attach stdout handler
        proc.stdout.on('data', (data) => {
            process.stdout.write(data.toString());
        });

        // Attach stderr handler
        proc.stderr.on('data', (data) => {
            process.stdout.write(data.toString());
        });

        // Attach exit handler
        proc.on('exit', (code) => {
            return typeof cb == 'function' ? cb(code) : code
        });
    }
};
