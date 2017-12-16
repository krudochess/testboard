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

        tb.env = {
            cwd: process.cwd(),
            cache: path.join(process.cwd(), '.testboard'),
            init: false
        };

        var init = args.indexOf("--init");
        if (init > -1) { tb.env.init = true; args.splice(init, 1); }

        var dir = args[0];

        if (!fs.existsSync(dir)) {
            if (!tb.env.init || !(path.extname(dir) == '.ini')) {
                return util.err("test case not found: "+dir);
            }
            util.copy(path.join(__dirname, '../ini/template/init.ini'), dir);
        }

        if (fs.lstatSync(dir).isFile()) {
            return tb.runTestCase(dir);
        }

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
