
const wiki = require("nodemw");
const fs = require("fs");
const String = require('../bin/util/string-extension.js');
const wikiClient = new wiki({
    protocol: "https", // Wikipedia now enforces HTTPS
    server: "exvius.gamepedia.com", // host name of MediaWiki-powered site
    path: "/", // path to api.php script
    debug: false // is more verbose when set to true
});
const valueMultiLineRegexp = /\|(.*)(?:=)(.*[^|]+)/g;

const dumpLocation = "data/eventsdump.txt";
const saveLocation = "data/events.json";

cacheEvents();
function cacheEvents() {
    wikiClient.getArticle("News/Archives", (err, content, redirect) => {

        if(err) {
            log(err);
            return;
        }

        fs.writeFileSync(dumpLocation, content);
        
        var reg = /{{(Recent.*[\s\S]*?}})/g;
        var events = content.match(reg);
        var eventObject = {}
        events.forEach((event, i) => {
            var match = valueMultiLineRegexp.exec(event);

            eventObject[i] = {}
            while (match != null) {

                var name = match[1].trim().toTitleCase();
                var value = match[2].trim().toTitleCase().replaceAll("\n", "");
                if (name.includes("Url")) {
                    value = value.replace("}}", "");
                }
                eventObject[i][name] = value;
        
                match = valueMultiLineRegexp.exec(event);
            }
        });

        var dump = JSON.stringify(eventObject, null, "\t");
        fs.writeFileSync(saveLocation, dump);
    });
}