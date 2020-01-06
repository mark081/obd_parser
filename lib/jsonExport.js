const Database = require('better-sqlite3');
const fs = require('fs');
const config = require('config');
const translations = config.get('commandMap');
const Server = require('mongodb-core').Server;
const assert = require('assert');

const readline = require('readline');
const {google} = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'credentials.json';


exports.parseDataFromIntermediate =  (dbFile,parser) => {

    return new Promise((resolve, reject) => {
        fs.readFile(`./parsers/${parser}.prx`, 'utf-8', (err, data) => {
            if (err) {
                reject(err);
                return
            }
            let result = [];
            let db = new Database(dbFile, {fileMustExist: true, readonly: false});
            /*
                        Parse and execute any helper files
                        TODO: Search Dir for files in the format _{parser}_x - For now just support one
             */
            let helper = `./parsers/_${parser}_1.hpx`;
            try {
                let stat = fs.statSync(helper);
                let recordsProcessed = fs.readFileSync(helper, 'utf-8').split(';')
                    .map(x => db.prepare(x + ';').run())
                    .reduce((count, rowInsert) => rowInsert.changes ? count + 1 : count, 0);

                console.log(`${recordsProcessed} records successfully processed`);

            } catch (err) {
                console.log(`${helper} file not found. Ignoring`);
            }

            for (let key in translations) {
                if (translations.hasOwnProperty(key)) {
                    let ID = key;
                    try {
                        let kv = translations[key][parser];
                        kv.value.forEach( extID => {
                                let statement = db.prepare(data);
                                result.push(JSON.parse(JSON.stringify(statement.all({extID: extID, ID: ID}))));
                            }
                    )
                    }
                    catch (err) {console.log(`${key}: not available for ${parser}`)}
                }
            }
            result?resolve(result):reject('No Data Returned');
        });
    });
};


exports.pushToDest = (data,argv) => {

    return new Promise ((resolve, reject) => {
        switch (argv.t) {
            case 'stdout':
                process.stdout.write(JSON.stringify(data));
                resolve('Success');
                break;
            case 'mongo':
                let host = argv.d ? argv.d : 'localhost';
                let port = argv.r ? argv.r : 27017;
                let username = argv.u ? argv.u : null;
                let password = argv.w ? argv.w : null;
                let collection = argv.c ? argv.c : 'obd.commands';
                exportToMongo(data,host,port,username,password,collection)
                    .then(() => resolve(), (err) => reject(err));
                break;
            case 'file':
                let filename = argv.d  ? (argv.d) : 'tmp.json';
                exportToFilename(data,filename)
                    .then(() => resolve(), (err) => reject(err));
                break;
            case 'gsheet':
                exportToGSheet(data);
                break;
            default:
                reject('export type not supported')

        }
    })
};

exportToFilename = (data, filename) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(filename, JSON.stringify(data, null, 1), (err) => {
            if (err) {
                console.error(err);
                reject(err);
            } else resolve()
        });
    });
};

exportToMongo = (data, host, port, username, password, collection ) => {

    const {promisify} = require('util');

    return new Promise((resolve, reject) => {
        data.forEach((dataSet) => {

            let server = new Server({
                host: host
                , port: port
                , reconnect: true
                , reconnectInterval: 50
            });
            server.on('connect', (_server) => {
                console.log(`Uploading: ${dataSet[0].normalized_name}`);

                let auth = promisify(_server.auth).bind(_server);
                let command = promisify(_server.command).bind(_server);
                let insert = promisify(_server.insert).bind(_server);
                let db_user = username.split('.');

                auth('scram-sha-1', db_user[0], db_user[1], password)
                    .then(() => command('system.$cmd', {ismaster: true}), (err) => console.error(err))
                    .then(() => insert(collection, dataSet, {writeConcern: {w: 1}, ordered: true}))
                    .then(() => command('system.$cmd', {ismaster: true}), (err) => console.error(err))
                    .then(() => resolve())
                    .catch((err) => reject(err))
                /*
                    Finally() is supposed to be introduced in Node 10 for now we'll just put another .then after the .catch
                    .finally(() => _server.destroy());
                */
                    .then(() => _server.destroy());

            });
            server.connect();
        });
    });
};

exportToGSheet = (parserData) => {

    getGSheetData()
        .then((oldData) => updateVehicleList(oldData, parserData))
        .then((newData) => updateGSheetData(newData))
        .catch((err) => console.error(err));
};

updateVehicleList = async (data, parserData) => {
    const FIRST_ELEMENT = 7;
    const FIRST_VEHICLE = 3;
    let elements = data.values[0];
    let vehicles = data.values.slice(FIRST_VEHICLE,data.values.length);

     let newValues = data.values.slice(0,FIRST_VEHICLE).concat(vehicles.reduce((updatedVehicles, vehicle) =>
    {
        let newVehicle = [].concat(vehicle)
        for(i = FIRST_ELEMENT; i < elements.length; i++ ) {
            let x = getUpdatedValue(vehicle[0], vehicle[1], vehicle[2], vehicle[i], elements[i], parserData);
            newVehicle[i] = x;
        }
        updatedVehicles.push(newVehicle);
        return updatedVehicles;
    },[]));

     return {...data, values: newValues};
};

getUpdatedValue = (make,model,year,currentValue,item, parserData) =>
{
    //1. Find the array with 'item' in it
    let result = currentValue;
    parserData.forEach((data) => {
        if(data[0].id === item) {
            //3. Didn't find an exact match so need to see if this contains data for this manufacturer
            data.forEach(row => {
                if(row.make === make) {
                    result =  '❌';
                }});
            //2. Found the item, now try go for gusto, try to find the make, model and year
            data.forEach(row => {
                if(row.make === make && row.model === model && RegExp(year).test(row.year)) {
                    result = '✅';
                }});
        }
    });
    //4. Didnt find either so just return the original value
    return result;
};

updateGSheetData = async (data) => {
    if (fs.statSync('client_secret.json')) {
        let content = fs.readFileSync('client_secret.json');
        let auth = authorizeSync(JSON.parse(content));
        return await updateVehicles(data, auth);
    }
};

updateVehicles = async (data, auth) => {
    const sheets = google.sheets({version: 'v4', auth});
    const promisify = require('util').promisify;
    const ssPut = promisify(require('googleapis').google.sheets({version: 'v4', auth}).spreadsheets.values.update);

    return await ssPut({
        spreadsheetId: '1Y6VeB0Y1cf-jUsIfSDgGhqG6g8y8BK4BwR10E_GtGsY',
        range: `${data.range}`,
        valueInputOption: 'RAW',
        resource: {
            values: data.values
        }
    })
};


getGSheetData = async () => {
    let result = [];
    if (fs.statSync('client_secret.json')) {
        let content = fs.readFileSync('client_secret.json');
        let auth = authorizeSync(JSON.parse(content));
        return (await getVehicles(auth)).data;
    }
};

getVehicles = async (auth) => {
    const promisify = require('util').promisify;
    const ssGet = promisify(require('googleapis').google.sheets({version: 'v4', auth}).spreadsheets.values.get);
    const vehicleItemRange = 'Auto-CodeList!A2:AK245';
    return await ssGet({
        spreadsheetId: '1Y6VeB0Y1cf-jUsIfSDgGhqG6g8y8BK4BwR10E_GtGsY',
        range: vehicleItemRange})
};

authorizeSync = (credentials) => {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    if(fs.statSync(TOKEN_PATH)) {
        let token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        return(oAuth2Client);
    }
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return callback(err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}
