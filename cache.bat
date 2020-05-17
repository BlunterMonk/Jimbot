
cd ../ffbe/ 
git pull
cd ../ffbe-jp/
git pull
cd ../Jimbot

node caching/cacheUnitsList.js
node caching/cacheRankingsDump.js
node cac8hing/cacheEvents.js
REM node caching/cacheUnitSkills.js
REM node caching/cullSkills.js

echo 'update complete'
