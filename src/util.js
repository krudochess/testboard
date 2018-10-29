/*!
 * TestBoard
 * Copyright(c) 2016-2017 Javanile.org
 * MIT Licensed
 */

const fs = require("fs")
    , join = require("path").join
    , spawn = require("child_process").spawn
    , parse = require('ini').parse
    , unsafe = require('ini').safe
    , stringify = require('ini').stringify
    , mkdir = require('shelljs').mkdir
    , exec = require("child_process").execSync
    , col = require("colors")
    , os = require('os')

module.exports = {

    /**
     * Print info message.
     *
     * @param msg
     */
    info: function (msg, tokens) {
        console.log(col.yellow.bold('[INFO]'), this.applyTokens(msg, tokens));
    },

    /**
     * Print error message.
     *
     * @param msg
     */
    err: function (msg, tokens) {
        switch (msg) {
            case "&require-command": msg = "Missing command, type 'ndev --help'."; break;
            case "&require-script": msg = "Missing script name, type 'ndev --help ${cmd}'."; break;
            case "&require-module": msg = "Missing module name, type 'ndev --help ${cmd}'."; break;
            case "&cmd-undefined": msg = "Undefined command '${cmd}', type 'ndev --help'."; break;
        }

        console.log(col.red.bold('[ERROR]'), this.applyTokens(msg, tokens));
    },

    /**
     *
     * @param token
     */
    applyTokens: function (msg, tokens) {
        for (var token in tokens) {
            if (tokens.hasOwnProperty(token)) {
                msg = msg.replace(new RegExp("\\$\\{"+token+"\\}", 'g'), tokens[token]);
            }
        }
        return msg;
    },

    /**
     *
     */
    indent: function (pre, msg) {
        return pre + msg.split("\n").join("\n" + this.pad(pre.length));
    },

    /**
     *
     */
    pad: function (len) {
        var str = "";
        for (var i = 0; i < len; i++) { str += " "; }
        return str;
    },

    /**
     *
     */
    trim: function (str) {
        return str.trim();
    },

    /**
     * Upper case first char.
     *
     * @param str
     */
    ucfirst: function (str) {
        return str ? str.charAt(0).toUpperCase() + str.substr(1) : "";
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
            repo = exec("npm view " + module + " repository.url --silent")+"";
        } catch (ex) {}
        return repo ? repo.replace(/^git\+https/i, "https") : null;
    },

    /**
     *
     */
    exec: function (cmd, args, callback) {
        var ext = ".sh";
        var script = join(__dirname, "../exec/ndev-" + cmd + ext);
        var rawCommand = cmd + " " + args.join(" ");

        // Running command
        var wrapper = spawn(script, args);

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

        return rawCommand;
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
        return str.replace('(', '\\(').replace(')', '\\)');
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
     *
     */
    matchAll: function (regex, data) {
        let matchs = [];

        let match = regex.exec(data);
        while (match != null) {
            matchs.push(match);
            match = regex.exec(data);
        }

        return matchs;
    }
};
