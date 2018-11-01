'use strict';

const chai = require('chai')
    , util = require('../src/util')

describe('Testing util library', function () {
    it('Test matchAll', function () {
        let matchs = util.matchAll(/[a-z]o/gi, 'Hello World')
        chai.assert.equal(matchs[0][0], 'lo')
        chai.assert.equal(matchs[1][0], 'Wo')
    })
})
