
const fs = require("fs")
    , join = require('path').join
    , jison = require("jison")
    , grammar = fs.readFileSync(join(__dirname, '../jison/calculate'), 'utf8')
    , parser = new jison.Parser(grammar)
    , tb = require('./tb')

module.exports = {

    /**
     *
     * @param assert
     * @returns {Object|*|Array}
     */
    calculate: function (calculate, values) {
        console.log('CALCULATE:', calculate, values)
        parser.yy = values
        return parser.parse(calculate)
    }
};
