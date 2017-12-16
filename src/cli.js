/*!
 * ndev-framework
 * Copyright(c) 2016-2017 Javanile.org
 * MIT Licensed
 */

var fs = require("fs"),
    path = require("path"),
    util = require("./util"),
    tb = require("./tb");

module.exports = {

    /**
     * Command line entry point.
     *
     * @param args
     */
    run: function(args, callback) {
        if (!args || args.length === 0) { return util.err("&require-command"); }

        // get file to run
        var file = null;
        for (var i in args) {
            if (!args.hasOwnProperty(i)) { continue; }
            if (args[i].charAt(0) != "-") {
                file = args[i];
                args.splice(i, 1);
                break;
            }
        }

        // process init
        var init = args.indexOf("--init");
        if (init > -1 && !fs.existsSync(file) && path.extname(file) == '.ini') {
            util.mkdir(path.dirname(file));
            util.copy(path.join(__dirname, '../ini/template/init.ini'), file);
            return util.info('Test case create', file);
        }

        // prepare environment
        tb.env = {
            cwd: process.cwd(),
            cache: path.join(process.cwd(), '.testboard'),
            init: init > -1
        };

        // check file exists
        if (!fs.existsSync(file)) {
            return util.err("test case not found: "+file);
        }

        // run single test case
        if (fs.lstatSync(file).isFile()) {
            return tb.runTestCase(file);
        }

        // run multiple test case into directory
        console.log("TODO: implement multimple test case on directory.");
    },

    /**
     * Get software help.
     *
     * @param args
     */
    getHelp: function (args) {
        var help = path.join(__dirname, "../help/help.txt");
        if (!args[0]) { console.log(fs.readFileSync(help)+""); }
        help = path.join(__dirname, "../help/" + args[0] + ".txt");
        if (fs.existsSync(help)) { return console.log(fs.readFileSync(help)+""); }
        return util.err("&cmd-undefined", { cmd: args[0] });
    },

    /**
     * Get software version.
     *
     * @param args
     */
    getVersion: function () {
        var info = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json")), "utf8");
        util.info("ndev-framework " + info.version, "developed by Francesco Bianco <bianco@javanile.org>");
        return info.name + "@" + info.version;
    }
};
