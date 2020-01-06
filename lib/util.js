const fs = require('fs');
const path = require('path');

module.exports = {
    /**
     * Traverses a given directory, returning an array of filenames matching an optional regex
     *
     * @param dir - root directory of search
     * @param regex - optional regex to match against filenames - default returns all filenames
     * @returns {*} - array for filenames (complete with full path)
     */
    read: (dir, regex = /.+/) =>
        fs.readdirSync(dir)
            .reduce((files, file) =>
                fs.statSync(path.join(dir, file)).isDirectory() ? files.concat(module.exports.read(path.join(dir, file), regex)) :
                    regex.test(file) ? files.concat(path.join(dir, file)) : files, []),

    /**
     * Somewhat safer version of eval which will return a JSON object given as string and will evaluate any expressions
     * @param obj - JSON string with optional function calls
     * @returns {*} - JSON object
     */
    evalToJSON: (obj) => {
        return Function('"use strict";return (' + obj + ')')();
    }

};


