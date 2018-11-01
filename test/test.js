'use strict';

const chai = require('chai')
    , join = require('path').join
    , util = require('../src/util')
    , tb = require('../src/tb')

util.silent = true;

chai.use(require('chai-fs'));

describe('test/test.js: ', function () {
    it('Simple package.json script', function () {
        let result = tb.resolveExpression('$a$b', {
            '$a': 'A',
            '$b': '$a'
        })
        chai.assert.equal(result, 'AA')
    })
})
