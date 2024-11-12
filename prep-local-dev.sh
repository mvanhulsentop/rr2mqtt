# clone a specific tag of the iobRoker roborock adapter
# git clone -b 'v0.6.17' --single-branch --depth 1 https://github.com/csowada/ioBroker.roborock.git .
git clone https://github.com/csowada/ioBroker.roborock.git .

cp ./rr2mqtt-adapter.js ./ioBroker.roborock
cp ./rr2mqtt-main.js ./ioBroker.roborock

cd ./ioBroker.roborock

npm remove @iobroker/adapter-core && npm ci --omit=dev && npm install jszip

#patch main.js file to use the modified adapter
sed -i 's/require("@iobroker\/adapter-core")/require(".\/rr2mqtt-adapter")/g' main.js