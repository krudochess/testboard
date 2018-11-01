'use strict';

const chai = require('chai')
    , join = require('path').join
    , util = require('../src/util')

chai.use(require('chai-fs'))

describe('Other tests', function () {
    it('Have bin file', function () {
        chai.assert.isFile(join(__dirname, '../bin/testboard'))
    })
})
