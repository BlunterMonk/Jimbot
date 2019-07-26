#!/bin/bash

cd ../ffbe/ 
git pull
cd ../ffbe-jp/
git pull
cd ../Jimbot

nodejs caching/cacheUnitsList.js
#:node caching/cacheDamage.js
nodejs caching/cacheRankingsDump.js
nodejs caching/cacheEvents.js
#node caching/cacheUnitSkills.js
#node caching/cullSkills.js
