'use strict';

const chai = require('chai')
    , util = require('../src/util')

describe('Testing util library', function () {
    it('Test applyTokens', function () {
        var message = util.applyTokens('${token1}${token2}', {
            token1: '1',
            token2: '2'
        })
        chai.assert.equal(message, '12')
    })
})
