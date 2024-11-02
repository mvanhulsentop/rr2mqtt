git submodule add https://github.com/copystring/ioBroker.roborock.git

cp ./rr2mqtt-adapter.js ./ioBroker.roborock
cp ./rr2mqtt-main.js ./ioBroker.roborock

cd ./ioBroker.roborock

npm ci --omit=dev && npm install jszip mqtt

sed -i 's/require("@iobroker\/adapter-core")/require(".\/rr2mqtt-adapter")/g' rr2mqtt-main.js