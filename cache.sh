#!/bin/bash

cd ../ffbe/ 
git pull
cd ../ffbe-jp/
git pull
cd ../Jimbot

node caching/cacheUnitsList.js
#:no caching/cacheDamage.js
node caching/cacheRankingsDump.js
node caching/cacheEvents.js
#node caching/cacheUnitSkills.js
#node caching/cullSkills.js

echo 'update complete'
