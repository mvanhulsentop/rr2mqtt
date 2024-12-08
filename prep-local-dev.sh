# clone a specific tag of the iobRoker roborock adapter
# git clone --single-branch --depth 1 -b 'develop' https://github.com/csowada/ioBroker.roborock.git ./ioBroker.roborock

# clone main branch
git clone https://github.com/csowada/ioBroker.roborock.git ./ioBroker.roborock

cp ./rr2mqtt-adapter.js ./ioBroker.roborock
cp ./rr2mqtt-main.js ./ioBroker.roborock

cd ./ioBroker.roborock

npm remove @iobroker/adapter-core && npm ci --omit=dev && npm install jszip

#patch main.js file to use the modified adapter
sed -i 's/require("@iobroker\/adapter-core")/require(".\/rr2mqtt-adapter")/g' main.js