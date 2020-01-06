# Parsers


**Defining a Parser**

A parser is essentially a SQL query which is executed against the manufacturer specific SQLite DB that was created during the import.
<br><br>There are two data elements passed into the query:

* @ID - this is the NAUTO id that the result set will map to. This just needs to be returned in the result set (internal ID)
* @extID - this is the query parameter that will be used to get the data (external ID) 

For example, here is the parser for FORD (ford.prx)
```
SELECT DISTINCT @ID id, "FORD" make, Final_Parameters.Year year, Final_Parameters.Model model, Final_Parameters.Module_Protocol protocol, "Alternate Acronym" externalID, Unit unit, QuantityType type, Offset offset, Multiplier multiplier, Divisor divisor, FromValue fromValue, ToValue toValue, UnitMultiplier unitMultiplier, [Module Address] ecuAddress, ModuleName ecu, 22 mode,
"HexAddress" pid, HexMask 'mask', shift, size
FROM Final_Parameters
INNER JOIN "Final_Parameter Converters" ON Final_Parameters.ConverterName = "Final_Parameter Converters".ConverterName
INNER JOIN [Final_Module List] ON ([Final_Module List].VehicleID = Final_Parameters.VehicleID AND [Final_Module List].ModuleType = Final_Parameters.ModuleName)
WHERE `Alternate Acronym` like @extID
```

The mapping between the internal ID (@ID) and the external ID (@extID) is mapped at ../config/default.json

For example, here is a snippet mapping Battery Voltage

```json
    "Brake applied": {
      "toyota": {
        "value": [
          "Brake Negative Pressure"
        ]
      },
      "ford": {
        "value": [
          "Brake Pedal Position"
        ]
      },
      "mazda": {
        "value": [
          "Brake Pedal Position"
        ]
      }
    }
```

In this case then, the code will iterate though the JSON object defined in default.json and will pass 'Brake applied' 
to the parser as @ID and "Brake Pedal Position" as @extID to the FORD parser. 

At the risk of stating the obvious, the code will pass "Brake Negative Pressure" as @extID to the TOYOTA Parser.

Couple things to note:

* Not all manufacturers will be defined in each element. When the obd_export is run it will show something like this:

<code>Airbag has Deployed: not available for toyota</code>

* Sometimes, for a given manufactures there will need to be multiple entries for a give Internal ID. This is because some
vehicles with a common make have different ECU's. This is supported for example:

```json
    "Door is ajar": {
      "ford": {
        "value": [
          "Driver Door Ajar Switch Status"
        ]
      },
      "ford": {
        "value": [
          "Drivers Door Ajar Switch Status"
        ]
      },
      "mazda": {
        "value": [
          "Driver Door Ajar Switch Status"
        ]
      },
      "toyota": {
        "value": [
          "Driver Side Door"
        ]
      }
    }
```

**Helper SQL**

Sometimes we need an additional SQL to support the parser. To support this, prior to executing the parser query, the exporter
will look for a file in the format _[parser_name]_1.hpx. and execute this. (Future versions will support helper functions beyond SQL queries)

These typicall involve creating temporary tables to increase parser performance (reduce joins for example)