#!/bin/bash
set -e

to=$1
shift

cont=$(docker run --rm -d "$@")
code=$(timeout -t "$to" docker wait "$cont" || true)
docker kill $cont &> /dev/null
echo -n 'status: '
if [ -z "$code" ]; then
    echo timeout
else
    echo exited: $code
fi

docker logs $cont | sed 's/^/\t/'
docker rm $cont &> /dev/null

exit 0
