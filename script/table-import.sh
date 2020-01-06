#!/usr/bin/env bash --


#Bash script with creates tables (table_name) for a give CSV file (file_name)

db_name=$1
table_name=$2
file_name=$3

echo ${db_name}
echo ${file_name}
echo ${table_name}

sqlite3 -batch ${db_name} << EOF
.headers off
.log ./log/log.${table_name}.err
.mode csv
.import ${file_name} ${table_name}
EOF