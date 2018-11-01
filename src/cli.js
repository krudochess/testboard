/*!
 * TestBoard
 * Copyright(c) 2016-2018 Javanile & Krudochess
 * MIT Licensed
 */

const fs = require('fs')
    , join = require('path').join
    , dirname = require('path').dirname
    , extname = require('path').extname
    , glob = require('glob')
    , util = require('./util')
    , tb = require('./tb');

module.exports = {

    /**
     * Command line entry point.
     *
     * @param args
     */
    run: function(args, cb) {
        if (!args || args.length === 0) {
            return util.error(`Missing test case or directory, type 'testboard --help'.`, cb)
        }

        if (args.indexOf('--version') > -1) { return this.version(cb) }
        if (args.indexOf('--help') > -1) { return this.help(cb) }

        // get path to run
        var path = null;
        for (var i in args) {
            if (!args.hasOwnProperty(i)) { continue; }
            if (args[i].charAt(0) != '-') {
                path = args[i];
                args.splice(i, 1);
                break;
            }
        }

        // process init
        var init = args.indexOf('--init');
        if (init > -1 && !fs.existsSync(path) && extname(path) == '.ini') {
            util.mkdir(dirname(file));
            util.copy(join(__dirname, '../ini/template/init.ini'), path);
            return util.info('Create test case', file);
        }

        // process program
        var program = args.indexOf('--program');
        if (program > -1) {
            return this.addProgram(args, program);
        }

        // prepare environment
        tb.env = {
            cwd: process.cwd(),
            cache: join(process.cwd(), '.tb'),
        };

        // check file exists
        if (!fs.existsSync(path)) {
            return util.error(`Test case '${path}' or directory not found.`);
        }

        // run single test case
        if (fs.lstatSync(path).isFile()) {
            return tb.runTestCase(path);
        }

        // run multiple tests into folder
        tb.runSingleTestCase = false;
        glob('**/*.ini', { cwd: path }, (err, files) => {
            for (let i in files) {
                tb.runTestCase(join(path, files[i]))
            }
            if (tb.runnedTestCase == 0) {
                util.error(`No test case found into '${path}' directory.`);
            }
        })
    },

    /**
     * Get software help.
     *
     * @param args
     */
    addProgram: function (args, offset) {
        // NOT CLEAR
        var program = args[offset + 1];
        var exefile = args[offset + 2];

        util.updateGlobal('programs', program, exefile);

        console.log (program, exefile);
    },

    /**
     * Get software version.
     *
     * @param args
     */
    version: function (cb) {
        let json = JSON.parse(fs.readFileSync(join(__dirname, '../package.json')), 'utf8')
        util.info(`TestBoard ${json.version} developed by ${json.author.name} <${json.author.email}>`)
        return cb(json.name + '@' + json.version)
    },

    /**
     * Get software help.
     *
     * @param args
     */
    help: function (cb) {
        let help = fs.readFileSync(join(__dirname, '../help/help.txt')).toString()
        util.log(help)
        return cb(help)
    }
}
