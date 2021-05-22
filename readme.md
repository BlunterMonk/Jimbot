### Configuration ###

In order to get Jimbot to run, please configure the files within the directory titled "credentials". This should contain the following files:

'discord.json': contains information for the discord bot to run
'google.json': tokens to allow access to Google API's
'wiki.json': credentials to access the FFBE Wiki

All expected values for these credentials files can be found in the correlating ".dist" files.

The Google API token information can be obtained by visiting the Google API Console: https://console.developers.google.com/

Create a project for "Google Sheets API" and create the OAuth 2.0 credentials file.
Download this file and rename it to "google.json". Place this file into the "credentials" directory.

### Build Notes ###

install node-gyp globally
```
npm install -g node-gyp
```

nodejs must be version ^8
```
brew install node@8
```
Also remember that you can install more than 1 node package at the same time, but you cannot have them available at the same time. So if you have the latest/generic node package already installed you need to unlink it first:
```
brew unlink node
```
And then you can link a different version:
```
brew link node@8
```

# windows

Make sure VS2015 is installed, and set it in npm
```
npm config set msvs_version 2015 --global
```

make sure servece creater is installed to run the bot as a service
```
npm install -g qckwinsvc
```