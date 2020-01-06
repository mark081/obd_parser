/**
 * Entry point for importing data into the parser. Currently support MDB (Access DB) and xls/xlsx (Microsoft Excel
 */
const yargs = require('yargs');

const argv = yargs
    .usage(`Usage: obd_import -t [mdb|xls] -s filename -d filename -x [true | false]`)
    .help('h')
    .alias('h','help')
    .demand('t')
    .alias('t', 'type')
    .nargs('t', 1)
    .describe('t', 'Type of input source')
    .demand('s')
    .alias('s', 'source')
    .nargs('s', 1)
    .describe('s', 'Source file - mdb or root directory (xls)')
    .demand('d')
    .alias('d', 'dest')
    .nargs('d', 1)
    .describe('d', 'Destination DB filename (sqlite)')
    .alias('x', 'overwrite')
    .nargs('x', 1)
    .describe('x', 'OK to overwrite existing destination DB')
    .alias('m', 'schema-file')
    .nargs('m', 1)
    .describe('m', 'schema file - for debug')
    .argv;

const {generateSchemaFileFromMdb, createDBFromSchemaFile, importDataFromMDB} = require('./lib/mdbImport');
const {getXLSFilesfromRoot, importXLSData} = require('./lib/xlsImport');


const dbFile = argv.d;
const root = argv.s;
const schemaFile = argv.m ? argv.m : './sql/001_schema.sql';
const overwrite_existing = argv.x? argv.x : false;
const source_type = argv.t;

switch (source_type) {
    case 'mdb': {
        generateSchemaFileFromMdb(root, schemaFile, overwrite_existing)
            .then(() => createDBFromSchemaFile(schemaFile, dbFile, overwrite_existing))
            .then((tablnames) => importDataFromMDB(tablnames, root, dbFile))
            .then((tablenames) => console.log(tablenames))
            .catch((err) => console.error(err));
        break;
    }
    case 'xls': {
        let temp = getXLSFilesfromRoot(root);
        getXLSFilesfromRoot(root)
            .then((filenames) => importXLSData(filenames,dbFile,overwrite_existing))
            .then((result) => console.log(`Processed ${result} files`))
            .catch((err) => console.error(err));
        break;
    }
    default: {
        console.error(`source type ${source_type} not supported`);
    }
}
