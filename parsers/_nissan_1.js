const read = require('../lib/util').read;
const shell = require('shelljs');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const assert = require('assert');


let wb = XLSX.read(fs.readFileSync('/Users/mark/Workspace/obd_parser/tmp/Vehicle_Master_List.xlsx'), {type: 'buffer'}); //TODO - Config File
let carCol = 'C';
let specColStart = 4;
let years = ['MY2017','MY2016','MY2015','MY2014','MY2013','MY2012','MY2011'];
let MAX_ROWS = 500; //Max number of rows we're going to bother with in an Excel sheet //TODO - Config File


const { message } = new assert.AssertionError({
    actual: 1,
    expected: 2,
    operator: 'notStrictEqual'
});

function* cellsInRange(sheet,range ) {
    sheet['!ref'] = range;
    let cellRange = XLSX.utils.decode_range(sheet['!ref']);

    let lastCol = cellRange.e.c;
    let lastRow = cellRange.e.r;

    for(x = cellRange.s.r; x <= lastRow; x++) {
        for (y = cellRange.s.c; y <= lastCol; y++) {
            let cellAddress = XLSX.utils.encode_cell({r: x, c: y});
            let cell = sheet[cellAddress];
            if (typeof cell !== 'undefined' && /^(CAN|UDS|DDL2)/g.test(cell.v)) {
                yield cell.v;
            }
        }
    }
}

nextCar = (index, sheet) => {
        if(index === MAX_ROWS)
            return false;
        if (sheet[carCol + index])
            return index;
        return nextCar(++index, sheet);

};

getSpecRange = (start, end, sheet) => {
    range = XLSX.utils.decode_range(sheet['!ref']);
    return  XLSX.utils.encode_range({s: {c:specColStart, r:start-1}, e: {c:range.e.c, r:end-1 }});//
};

iterateCars = (index, sheet, year, cars = {[year]:[]}) => {
    if (sheet[carCol + index]) {

        let car = {};
        let nextIndex = nextCar(index + 1, sheet);

        car.model = sheet[carCol + index].v;
        car.specs = [];
        for (let val of cellsInRange(sheet,getSpecRange(index,nextIndex - 1, sheet))) {
            car.specs = car.specs.concat(val.replace(/\r/g,'').split('\n').filter(x => /^(CAN|UDS|DDL2)/g.test(x)));
        }
        cars[year].push(car);

        if(nextIndex)
            iterateCars(nextIndex, sheet, year, cars);
        return cars;
    }
};



let vehicleMap = Object.keys(wb.Sheets)
    .reduce((x, y) => {
        let year = 'MY' + y.substr(-4);
        if(years.includes(year)) {
            let mySheet = wb.Sheets[y];
            let cars = iterateCars(1,mySheet,year);
            x.push(cars);
        }
        return x;
    },[]);

let temp = read('../test/db/Nissan/Nissan (2008 - 2017)/consolidated');
//let temp = read('../test/db/Nissan/Nissan (2008 - 2017)/consolidated');

let specFileMap = temp
    .map(x => [/(.+?)(\.[^.]*$|$)/g.exec(path.basename(x))[1],x]);

let i = 0;

let uniqueList = [];

vehicleMap.forEach(year => {
    let keys = Object.keys(year);
        for (let value of keys) {
            year[value].forEach( x => {
                x.specs.forEach( y => {
                    console.log(i++ + ': ' + y);
                    if( -1 === uniqueList.findIndex(x => x === y))
                        uniqueList.push(y);
                })
            })
        }
    }
);

uniqueList.forEach(x => {
    if(-1 === specFileMap.findIndex(y => x === y[0])) {
        console.log('Missing: ' + x );
    }
});

// let specMasterList = vehicleMap.reduce((specs, year) => {
//                                             let tmp = Object.values(year);
//                                             tmp.forEach(modelSpec => {
//                                                 modelSpec.forEach(x => {
//                                                     x.specs.forEach( y => {
//                                                         console.log('specs: ' + specs);
//                                                         specs = specs.concat(y);
//                                                     });
//                                                 });
//                                                     return specs;
//                                                 },[]);
//                                             });

let ECUMap = {ecu : {year: vehicleMap}};


fs.open('nissan_car.json','w+', (err,fd) => fs.writeSync(fd,JSON.stringify(ECUMap,null,2)));




//console.log(JSON.stringify(ECUMap,null,2));
console.log('finis');

