const wiki = require("nodemw");
const fs = require("fs");
const cheerio = require("cheerio");
const String = require('../bin/string/string-extension.js');
const wikiClient = new wiki({
    protocol: "https", // Wikipedia now enforces HTTPS
    server: "exvius.gamepedia.com", // host name of MediaWiki-powered site
    path: "/", // path to api.php script
    debug: false // is more verbose when set to true
});
const dumpLocation = "data/rankingsdump.txt";
const saveLocation = "data/rankingsdump.json";
const wikiEndpoint = "https://exvius.gamepedia.com";

loadRankingsList(() => { });

function log(data) {
    console.log(data);
}

function loadRankingsList(callback) {
    var search = "Unit_Rankings";
    wikiClient.getArticle(search, function (err, content, redirect) {
        if (err || !content) {
            console.error(err);
            return;
        }
        if (redirect) {
            log("Redirect Info: ");
            log(redirect);
        }

        wikiClient.parse(content, search, function (err, xml, images) {
            if (err) {
                log(err);
                return;
            }
            log("Parsing Unit Rankings Page");
            //log(xml);

            const $ = cheerio.load(xml);
            var table = $(".unit_rating");
            fs.writeFileSync(dumpLocation, xml);

            if (!table.is("table")) {
                log("Not Table");
                return;
            }
            var results = {};
            var headings = [];

            table
                .first()
                .find("th")
                .each(function (index, value) {
                    var head = $(value).text();
                    head = head.replaceAll("\n", "").toLowerCase();
                    headings.push(head);
                });

            // log(headings);

            table.each((tableIndex, element) => {
                $(element)
                    .find("tbody")
                    .children("tr")
                    .each(function (indx, obj) {
                        var row = {};
                        var tds = $(this).children("td");

                        tds.each(function (ind) {
                            var value = $(this).text();
                            value = value.replaceAll("\n", "");
                            value = value.replaceAll(" ", "_");

                            if (ind == 0) {
                                // get icon url
                                var img = $(this).find("img").attr("src");
                                value = img;
                            } else if (ind == 1) {
                                var url = $(this).find("a").attr("href");
                                row.url = wikiEndpoint + url;
                                value = value.replaceAll("_", " ");
                            } else if (ind == 2) {
                                // get names of role icons because this isn't text :(
                                var links = $(this).children("img");
                                links.each(function (i) {
                                    if (i > 0) 
                                        value += ", ";
                                    value += $(this).attr("alt");
                                });
                            } else if (ind == 4) {
                                value = value.replaceAll("_", " ");
                                value = value.replace(/\./, "\n");
                            }

                            // log(value);

                            var key = headings[ind];
                            row[key] = value;
                        });

                        var unitName = row["name"];

                        if (unitName) {

                            var escpaedName = unitName.replace(
                                /[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g,
                                "\\$&"
                            );

                            try {
                                var notes = $(`#${escpaedName}_2`);
                                if (notes && notes.length > 0) {
                                    row["notes"] = notes
                                        .parent()
                                        .next()
                                        .text();
                                } else {
                                    //log(`Could not find '${escpaedName}_2', trying '${escpaedName}'.`);

                                    try {
                                        var notes = $(`#${escpaedName}`);
                                        if (notes && notes.length > 0) {
                                            row["notes"] = notes
                                                .parent()
                                                .next()
                                                .text();
                                        } else {
                                            log(`Found '${escpaedName}', could not find notes.`);
                                        }
                                    } catch (f) {
                                        log("Could not get notes for: " + escpaedName);
                                    }
                                }
                            } catch (e) {
                                log("Big Error: " + e);
                                log("Could not get notes for: " + escpaedName);
                            }

                            // log(row)
                            unitName = unitName.toLowerCase().replaceAll(" ", "_");
                            results[unitName] = row;
                        }
                    });
            });

            // log(`Total Rankings: ${results.length}`);
            // log(results)
            var j = JSON.stringify(results);
            //log(j);
            fs.writeFileSync(saveLocation, j);
            log("Unit Rankings Updated");
            callback();
        });
    });
}