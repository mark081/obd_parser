const shell = require('shelljs');
const fs = require('fs');

const Database = require('better-sqlite3');

const {promisify} = require('util');
const { spawn } = require('child_process');
const { Writable } = require('stream');


const exec = promisify(require('shelljs').exec);
const open = promisify(require('fs').open);
const write = promisify(require('fs').write);

/**
 * Generates a SQL schema file from the provided MDB file
 *
 * @param mdbFile - Access DB file
 * @param schemaFile - schema file
 * @param overwrite - if true, overwrites existing schema file
 */
exports.generateSchemaFileFromMdb = (mdbFile, schemaFile, overwrite) => {

    if(overwrite)
        shell.rm(schemaFile);

    return new Promise ((resolve, reject) => {
        open(schemaFile, 'wx' )
            .then(() => { console.log('Schema does not exist - creating') })
            .then(() => exec(`mdb-schema  --no-relations "${mdbFile}" sqlite`,{silent:true, async:true}))
            .then((content) => {
                if(content)
                fs.writeFile(schemaFile, content, (err) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else resolve()
                });
                else reject()
            })
            .catch((err) => {
                reject(err);
            })
    });
};

/**
 * Creates a sqlite db from a schema file
 *
 * @param mdbFile - Access DB file
 * @param schemaFile - schema file
 * @param overwrite - if true, overwrites existing database file
 * @returns {[]} - array of tablenames
 */
exports.createDBFromSchemaFile = (schemaFile, dbFile, overwrite) => {

    if(overwrite)
        shell.rm(dbFile);

    return new Promise ((resolve, reject) => {
        open(dbFile, 'wx')
            .then (() => { console.log('DB does not exist - creating...')})
            .then(() => {
                let db = new Database(dbFile);
                let schema = fs.readFileSync(schemaFile,'utf8');
                try {
                    let tableNames = [];
                        createStmts = schema.split(';'); //Breaks the SQL file into individual SQL Statements
                        createStmts.pop();
                        let transaction = db.transaction(createStmts);
                        transaction.run();
                         createStmts.forEach(stmnt => {
                                 tableNames.push(stmnt.split('CREATE TABLE')[1].split('(')[0].replace(/`/g,'').replace(/\n/g,'').replace(/^\s+|\s+$/g,'')); //Takes care of some of the non-compatable naming
                        });
                        db.close();
                    resolve(tableNames);
                } catch (err) {
                    reject(err)
                }
            })
            .catch((err) => reject(err))
    });
};

/**
 * Migrates AccessDB to SqlLite
 *
 * @param tableNames - List of the tablenames to be migrated
 * @param mdbFile - Access DB to be migrated
 * @param dbFile - Sqlite DB target
 *
 */
exports.importDataFromMDB = (tableNames, mdbFile, dbFile) => {

    return new Promise ((resolve, reject) => {
        importTable(tableNames,mdbFile,dbFile);
        resolve();
    });
};

importTable = (tableNames, mdbFile, dbFile) => {

        console.log(`Exporting ${tableNames[0]}`);
        mdbExport = spawn(`mdb-export`,[ '-q', "'", '-I','sqlite', mdbFile,tableNames[0]]);
        let carryOver = [];
        let db = new Database(dbFile);


        const outstream = new Writable({
            write: function (chunk, encoding, callback) {
                let stmnts = chunk.toString().split(';');
                //There is going to be partial bits at the end and beginning of the chunk so save these for later
                carryOver.push(stmnts.shift());
                carryOver.push(stmnts.pop());
                try {
                    let transaction = db.transaction(stmnts);
                    transaction.run();
                }
                catch (err) {
                    console.error('Bad row: ' + err.toString());
                }
                callback();
            }
        });

        mdbExport.stdout.pipe(outstream);

        mdbExport.on('error', (err) => {
            console.log(err);
        });
        mdbExport.on('close', (code) => {
            //Process our leftovers
            let data = carryOver.join('');
            //TODO Deal with carryOver
            db.close();
            console.log(`DB closed child process exited with code ${code} leftovers to be processed: ${carryOver.length}`);
            if(tableNames.length > 0) {
                console.log('Table Names size = ' + tableNames.length);
                importTable(tableNames.slice(1), mdbFile, dbFile);
            }
        });
};