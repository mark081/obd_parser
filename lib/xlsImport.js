const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const read = require('./util.js').read;

/**
 * Returns all XL files below a given directory
 *
 * @param dir - root directory of search
 * @returns {Promise<*>} - array of XL files from root directory
 */
exports.getXLSFilesfromRoot = async (dir) =>  {
     return read(dir,/xls/);
};

/**
 * Converts XL file data into SQLite
 *
 * @param files - Array of XL files
 * @param dbname - Database file the XL tables will be created in
 * @param overwrite - overwrite existing SQLite DB
 * @param colHeaders - true if xl sheet has columns
 * @returns {Promise<*>} - Total number files processed
 */
exports.importXLSData = async (files, dbname, overwrite = false, colHeaders = true) => {

    if (overwrite)
        require('shelljs').rm(dbname);

    return files.reduce((filesProcessed, file) => {
        let wb = XLSX.read(fs.readFileSync(file), {type: 'buffer'});
        Object.keys(wb.Sheets)
            .map(key => [key,wb.Sheets[key]])
            .forEach(sheet => {
                try {
                    console.log(`Exporting table: ${sheet[0].replace(/ /g, '_')} in ${dbname}`);
                    fs.writeFileSync('./db/csx/nauto', XLSX.utils.sheet_to_csv(sheet[1]).replace(/,{1,}$/gm, ''));
                    spawnSync('./script/table-import.sh', [dbname, sheet[0].replace(/ /g, '_'), './db/csx/nauto']);
                    filesProcessed++;
                }
                catch (err) {
                    console.error(`${err}: File failed to process`);
                }
            });
            return filesProcessed;
        },0);

};
