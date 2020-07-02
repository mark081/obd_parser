![OBD Port](/OBDPort.png)

# OBD Parser


**Two CLI tools for importing and exporting OBD data**

### OBD Import

```
Usage: obd_import -t [mdb|xls] -s filename -d filename -x [true | false]

Options:
  --version          Show version number                               [boolean]
  -h, --help         Show help                                         [boolean]
  -t, --type         Type of input source                             [required]
  -s, --source       Source file - mdb or root directory (xls)        [required]
  -d, --dest         Destination DB filename (sqlite)                 [required]
  -x, --overwrite    OK to overwrite existing destination DB
  -m, --schema-file  schema file - for debug
```
Example:


> node obd_import.js -t mdb -s ./db/FordNA_V19.0.mdb -d ./db/ford.sqlite -x true 


### OBD Export

```
Usage: obd_export -t [file | stdout | mongo] -s filename -d destination

Options:
  --version         Show version number                                [boolean]
  -h, --help        Show help                                          [boolean]
  -t, --type        Type of output - [ stdout | file | mongo | gsheet (alpha)]
                                                                      [required]
  -p, --parser      parser [ford | toyota | mazda | jaguar]           [required]
  -s, --source      sqlite source DB file                             [required]
  -d, --dest        Output destination [filename | server name]
  -r, --port        port
  -c, --collection  db.collection - mongo only
  -u, --username    db.username - where db is the mongo db the user is defined
                    in
  -w, --password    password
```
Example:


> node obd_export.js -s ./db/ford.sqlite -p ford -t stdout 

Example Toyota output:

```
{
	"_id" : ObjectId("5b086486af1c0f5297bff915"),
	"ecu" : "Combination Meter",
	"Address" : "$7C0",
	"id" : "Door is Ajar",
	"make" : "TOYOTA",
	"year" : "2015",
	"model" : "Prius",
	"protocol" : "4",
	"externalID" : "Driver Side Door",
	"byte" : "6",
	"bit" : "$40",
	"LSB" : "1/1",
	"Offset" : "0",
	"fromValue" : "0",
	"toValue" : "1",
	"numberOfDecimals" : "0",
	"unit" : "",
	"mode" : "$21",
	"pid" : "$12",
	"support_pid" : "0",
	"byte_length" : "9"
}
```

Example Ford output:

```
{
	"_id" : ObjectId("5b08646caf1c0f5297bfd065"),
	"id" : "Door is Ajar",
	"make" : "Ford",
	"year" : "2013.00",
	"model" : "Transit Connect",
	"protocol" : "GEM/SJB_MSCAN",
	"externalID" : "Driver Door Ajar Switch Status",
	"unit" : "INT",
	"type" : "INT",
	"offset" : "0",
	"multiplier" : "1",
	"divisor" : "1",
	"fromValue" : null,
	"toValue" : null,
	"unitMultiplier" : "1",
	"ecu" : "GEM/SJB",
	"mode" : 22,
	"pid" : "0xA141"
}
```

### Additional software requirements


https://www.sqlite.org/index.html

For MacOS (validated against 3.19.3)

>brew install sqlite3

<br>

https://github.com/brianb/mdbtools

For MacOS (validated against 0.7.1) 

>brew install mdbtools

<br>





