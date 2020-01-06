const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const Server = require('mongodb-core').Server;
const evalToJSON = require('../lib/util').evalToJSON;
const config = require('config');
const translations = config.get('commandMap');

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'credentials.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    let x = JSON.parse(content);
    authorize(JSON.parse(content), listVehicles);
});

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



updateFromMongo = (data, host = 'localhost', port = '27017', username = 'admin.antimatter', password = 'abc123' ) => {


    const {promisify} = require('util');

    return new Promise((resolve, reject) => {

            let server = new Server({
                host: host
                , port: port
                , reconnect: true
                , reconnectInterval: 50
            });
                server.on('connect', (_server) => {

                let auth = promisify(_server.auth).bind(_server);
                let command = promisify(_server.command).bind(_server);
                let insert = promisify(_server.insert).bind(_server);
                let db_user = username.split('.');
                let cursor = _server.cursor('obd.commands', {
                    find: 'obd.commands'
                    , query: data
                });
                let next = promisify(cursor.next).bind(_server);

                auth('scram-sha-1', db_user[0], db_user[1], password)
                    .then(() => { return new Promise((resolve,reject) => {
                        let cursor = _server.cursor('obd.commands', {
                            find: 'obd.commands'
                            , query: data
                        });
                        cursor.next((err,doc) => {
                            if(err) reject(err);
                            else {
                                if(doc) {
                                    resolve(doc)
                                } else
                                    reject(null);
                            }
                        });
                        })})
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
};


function listVehicles(auth) {

    const promisify = require('util').promisify;
    const ssGet = promisify(require('googleapis').google.sheets({version: 'v4', auth}).spreadsheets.values.get);
    const vehicleItemRange = 'CodeList!A5:AK25';
    const itemNamesRange = 'Codelist!H2:AK2';

    // getUpdateRow = (items,row) => {
    //     let newRow = row.slice(0,7);
    //     items[0].forEach(item => {
    //         let queryString = `({"make": "${row[0]}","model": "${row[1]}", "year":RegExp("${row[2]}"), "id": "${item}"})`;
    //
    //         x = async () => {
    //             updateFromMongo(evalToJSON(queryString))
    //                 .then(() => {
    //                         console.log(`${row[2]} ${row[0]} ${row[1]} has ${item}`);
    //                         return(['😊']);
    //                     }
    //                     , () => {
    //                         console.error(`${row.slice(0, 2)} does not have ${item}`);
    //                         return(['😟']);
    //                     })
    //                 .catch((err) => console.error('Got here: ' + err))
    //         };
    //         let y = x();
    //         console.log(y);
    //     });
    //     console.log(newRow);
    // };

    // getUpdateRow = (items,row) => {
    //     let n = 7;
    //     items[0].reduce((newRow, item) => {
    //         let queryString = `({"make": "${row[0]}","model": "${row[1]}", "year":RegExp("${row[2]}"), "id": "${item}"})`;
    //         console.log(`${item} is ${n++}`);
    //
    //         async function asyncCall() {
    //             await updateFromMongo(evalToJSON(queryString))
    //                .then(() => {
    //                     console.log(`${row[2]} ${row[0]} ${row[1]} has ${item}`);
    //                         newRow.push(['😊']);
    //                     }
    //                     , () => {
    //                         console.error(`${row[2]} ${row[0]} ${row[1]} does not have ${item}`);
    //                         newRow.push(['😟']);
    //                     })
    //                 .catch((err) => console.error('Got here: ' + err));
    //         }
    //         asyncCall();
    //         console.log(newRow);
    //     }
    //     ,row.slice(0,7))
    //         .then((result) => {
    //             return result
    //         });
    //
    // };

    getUpdateRow = (items,row) => {
        return row;
    };

    vehicleParse = data => {
        return new Promise((resolve,reject) => {
                ssGet({
                    spreadsheetId: '1Y6VeB0Y1cf-jUsIfSDgGhqG6g8y8BK4BwR10E_GtGsY',
                    range: itemNamesRange
                }).then(items => {
                    data.reduce((rows,row) => rows.concat(getUpdateRow(items.data.values, row)),[]);
                });
            });
    };

    ssGet({
        spreadsheetId: '1Y6VeB0Y1cf-jUsIfSDgGhqG6g8y8BK4BwR10E_GtGsY',
        range: vehicleItemRange
    })
        .then(data => vehicleParse(data.data.values))
        .catch(err => console.error(err));



    // letsGetIt = range => {
    //     return new Promise((resolve, reject) => {
    //
    //     }
    //
    // }
//
//     const vehiclesRange = 'Codelist!A5:C45';
//
//     const dataFieldsRange = 'Codelist!H5:AK245';
//     let rows = [];
//     let newRows = [];
//     const sheets = google.sheets({version: 'v4', auth});
//
// //Get the data
//     sheets.spreadsheets.values.get({
//         spreadsheetId: '1Y6VeB0Y1cf-jUsIfSDgGhqG6g8y8BK4BwR10E_GtGsY',
//         range: vehicleItemRange
//     }, (err, {headers, data}) => {
//         if (err) return console.log('The API returned an error: ' + err);
//         rows = data.values;
//         if (rows.length) {
//             console.log('Rows: ' + rows);
//             rows.forEach(row => {
//
//                 let updateRow = row.slice(0);
//
//                 let model = row.shift();
//                 let year = row.shift();
//                 let rank = row.shift();
//                 newRows.push(row.map(element => 'X'));
//             });
//             console.log('Rows: ' + newRows);
//             sheets.spreadsheets.values.update({
//                 spreadsheetId: '1Y6VeB0Y1cf-jUsIfSDgGhqG6g8y8BK4BwR10E_GtGsY',
//                 range: dataFieldsRange,
//                 valueInputOption: 'RAW',
//                 resource : {
//                     majorDimension: "COLUMNS",
//                     values: newRows
//                 }
//             },(err, resp) => {
//                 if (err)
//                     console.error(err);
//                 else
//                     console.log(resp);
//             })
//         } else {
//             console.log('No data found.');
//         }
//     });

//Update the data

    // sheets.spreadsheets.values.update({
    //     spreadsheetId: '1Y6VeB0Y1cf-jUsIfSDgGhqG6g8y8BK4BwR10E_GtGsY',
    //     range: dataFieldsRange,
    //     valueInputOption: 'RAW',
    //     resource : {
    //         majorDimension: "COLUMNS",
    //         values: newRows
    //     }
    // },(err, resp) => {
    //     if (err)
    //         console.error(err);
    //     else
    //         console.log(resp);
    // })
}