
cd ../ffbe/ 
git pull
cd ../ffbe-jp/
git pull
cd ../Jimbot

node caching/cacheUnitsList.js
node caching/cacheRankingsDump.js
node caching/cacheEvents.js

echo 'update complete'
