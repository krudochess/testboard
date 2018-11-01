'use strict';

const chai = require('chai')
    , util = require('../src/util')
    , cli  = require('../src/cli')
    , tb = require('../src/tb')

util.silent = true;

chai.use(require('chai-fs'));

describe('Testing command-line', function () {

    it('Not arguments', function () {
        let message = cli.run([]);
        chai.assert.match(message, /testboard --help/, 'Not an help message');
    });

    /*
    it('Unknown command', function () {
        chai.assert.match(cli.run(['unknown']), /ndev --help/, 'Not an help message');
    });
    */

    it('Call help', function () {
        cli.run(['--help'], (info) => {
            chai.assert.match(info, /Usage:/)
        })
    });

    it('Call version', function () {
        cli.run(['--version'], (info) => {
            chai.assert.match(info, /[0-9]+\.[0-9]+\.[0-9]+/)
        });
    });
})
