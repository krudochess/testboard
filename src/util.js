/*!
 * TestBoard
 * Copyright(c) 2016-2018 Javanile & Krudochess
 * MIT Licensed
 */

const fs = require('fs')
    , join = require('path').join
    , spawn = require('child_process').spawn
    , parse = require('ini').parse
    , unsafe = require('ini').safe
    , stringify = require('ini').stringify
    , mkdir = require('shelljs').mkdir
    , exec = require('child_process').execSync
    , colors = require('colors')
    , os = require('os')

module.exports = {

    /**
     * Set silent mode.
     */
    silent: false,

    /**
     * Print log into console.
     */
    log: function (msg) {
        return this.silent || console.log(msg)
    },

    /**
     * Print info message.
     *
     * @param msg
     */
    info: function (msg, cb) {
        this.log(colors.yellow.bold('[INFO]') + ' ' + msg)
        return typeof cb === 'function' ? cb(msg) : msg
    },

    /**
     * Print error message.
     *
     * @param msg
     */
    error: function (msg, cb) {
        this.log(colors.red.bold('[ERROR]') + ' ' + msg)
        return typeof cb === 'function' ? cb(msg) : msg
    },

    /**
     * Upper case first char.
     *
     * @param str
     */
    ucfirst: function (str) {
        return str ? str.charAt(0).toUpperCase() + str.substr(1) : '';
    },

    /**
     * Check is valid repository url.
     */
    isRepo: function (repo) {
        return repo.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/);
    },

    /**
     *
     */
    getModuleRepo: function (module) {
        var repo = null;
        try {
            repo = exec('npm view ' + module + ' repository.url --silent')+'';
        } catch (ex) {}
        return repo ? repo.replace(/^git\+https/i, 'https') : null;
    },

    /**
     *
     * @param file
     */
    loadJson: function (file) {
        return require(file);
    },

    /**
     *
     * @param file
     * @param info
     */
    saveJson: function (file, info) {
        fs.writeFileSync(file, JSON.stringify(info, null, 4));
    },

    /**
     *
     */
    dirExists: function (path) {
        return fs.existsSync(path);
    },

    /**
     *
     */
    escapeBracket: function (str) {
        return str
            //.replace('$', '\\$')
            //.replace('(', '\\(')
            //.replace(')', '\\)')
            .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    },

    /**
     *
     */
    copy: function (src, dest) {
        if (!fs.existsSync(src)) {
            return false;
        }
        var data = fs.readFileSync(src, 'utf-8');
        fs.writeFileSync(dest, data);
    },

    /**
     *
     */
    mkdir: function (dir) {
        if (fs.existsSync(dir)) {
            return false;
        }
        return mkdir('-p', dir);
    },

    /**
     *
     */
    exitErrorFile: function (file, tokens) {
        var msg = fs.readFileSync(join(__dirname, '../help/error/' + file + '.txt'), 'utf-8');
        console.log(this.applyTokens(msg, tokens));
        process.exit();
    },

    /**
     *
     */
    updateGlobal: function (section, key, value) {
        var globalDir = join(os.homedir(), '.tb');
        var globalFile = join(globalDir, 'global.ini');

        this.mkdir(globalDir);
        var global = {};
        if (fs.existsSync(globalFile)) {
            global = parse(fs.readFileSync(globalFile, 'utf-8'));
        }
        if (!global) { global = {};}
        if (typeof global[section] === 'undefined') {
            global[section] = {};
        }

        global[section][key] = value;

        fs.writeFileSync(globalFile, stringify(global));
    },

    /**
     * Match all occurrencies of expression in a string.
     *
     */
    matchAll: function (regex, data) {
        let matchs = [];
        let match = regex.exec(data)

        while (match != null) {
            matchs.push(match)
            match = regex.exec(data)
        }

        return matchs
    }
}
