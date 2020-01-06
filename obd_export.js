const {pushToDest, parseDataFromIntermediate} = require('./lib/jsonExport');

const yargs = require('yargs');

const argv = yargs
    .usage(`Usage: obd_export -t [file | stdout | mongo] -s filename -d destination`)
    .help('h')
    .alias('h','help')
    .demand('t')
    .alias('t', 'type')
    .nargs('t', 1)
    .describe('t', 'Type of output - [ stdout | file | mongo | gsheet (alpha)]')
    .demand('p')
    .alias('p', 'parser')
    .nargs('p', 1)
    .describe('p', 'parser [ford | toyota | mazda | jaguar]')
    .demand('s')
    .alias('s', 'source')
    .nargs('s', 1)
    .describe('s', 'sqlite source DB file')
    .alias('d', 'dest')
    .nargs('d', 1)
    .describe('d', 'Output destination [filename | server name]')
    .alias('r', 'port')
    .nargs('r', 1)
    .describe('r', 'port')
    .alias('c', 'collection')
    .nargs('c', 1)
    .describe('c', 'db.collection - mongo only')
    .alias('u', 'username')
    .nargs('u', 1)
    .describe('u', 'db.username - where db is the mongo db the user is defined in')
    .alias('w', 'password')
    .nargs('w', 1)
    .describe('w', 'password')
    .argv;

parseDataFromIntermediate(argv.s,argv.p)
    .then((data) => pushToDest(data,argv))
    .then(() => {}, (err) => {console.error(err)});

