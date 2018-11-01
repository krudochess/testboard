/*!
 * TestBoard
 * Copyright(c) 2016-2018 Javanile & Krudochess
 * MIT Licensed
 */

const fs = require("fs")
    , join = require('path').join
    , jison = require("jison")
    , grammar = fs.readFileSync(join(__dirname, '../jison/assert'), 'utf8')
    , parser = new jison.Parser(grammar)
    , tb = require('./tb')

module.exports = {

    /**
     *
     * @param assert
     * @returns {Object|*|Array}
     */
    assert: function (assert, scope) {
        parser.yy = scope
        return parser.parse(assert)
    },

    /**
     *
     * @param assert
     * @returns {*|Array|Object}
     */
    verify: function (assert) {
        parser.yy = {

        }

        return parser.parse(assert)
    }
};
