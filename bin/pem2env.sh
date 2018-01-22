#!/bin/sh

if [ -f $1 ]; then
    cat $1 | awk '{printf "%s\\n",$0}' | sed -e 's/\\n$//g' | sed -e 's/^/PRIVATE_KEY=/'
else
    echo "${0} <file>"
fi