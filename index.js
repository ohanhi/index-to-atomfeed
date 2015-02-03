"use strict";

(function () {
  "use strict";

  var express = require("express"),
      app = express(),
      request = require("request"),
      cheerio = require("cheerio"),
      Mustache = require("mustache"),
      port = process.env.PORT || 8000;

  var getItems = function (scrapeUrl, callback) {
    var scrape = function (error, response, html) {
      if (!error) {
        (function () {
          var $ = cheerio.load(html);

          var objectify = function (idx, item) {
            var url = scrapeUrl + $(item).attr("href");
            if (!url.match(/\.mp3$/gi)) {
              return;
            }

            var linkText = $(item).text();
            var titleMatches = linkText.match(/\]\s(.+)\.mp3$/);
            var title = titleMatches ? titleMatches[1] : "";
            var dateMatches = linkText.match(/\[([0-9\.]+)\]/);
            var date = dateMatches ? dateMatches[1].replace(/\./g, "-") : "";

            return {
              title: title,
              date: date,
              link: url
            };
          };

          var items = $("a").map(objectify).get();

          callback(items);
        })();
      } else {
        callback([]);
      }
    };
    request(scrapeUrl, scrape);
  };

  var rssStartTemplate = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss xmlns:itunes=\"http://www.itunes.com/dtds/podcast-1.0.dtd\" version=\"2.0\"><channel><title>{{scrapeTitle}}</title><description>{{scrapeDescription}}</description><link>{{scrapeUrl}}</link><language>en-us</language><copyright>Copyright</copyright><lastBuildDate>{{currentDate}}</lastBuildDate><pubDate>{{currentDate}}</pubDate><docs>{{docs}}</docs><webMaster>{{webMaster}}</webMaster><ttl>60</ttl><itunes:author>{{author}}</itunes:author><itunes:subtitle></itunes:subtitle><itunes:summary></itunes:summary><itunes:owner>   <itunes:name></itunes:name>   <itunes:email></itunes:email></itunes:owner><itunes:explicit>No</itunes:explicit><itunes:image href=\"http://www.placekitten.com/600/600\"/>";

  var rssEndTemplate = "</channel></rss>";

  var itemTemplate = "<item><title>{{title}}</title><link>{{link}}</link><guid>{{link}}</guid><description>{{title}} (scraped from HTML)</description><enclosure url=\"{{link}}\" type=\"audio/mpeg\"/><category>Podcasts</category><pubDate>{{pubDate}}</pubDate><itunes:author>{{author}}</itunes:author><itunes:explicit>No</itunes:explicit><itunes:subtitle>{{title}}, {{prettyDate}}</itunes:subtitle><itunes:summary>{{title}}, {{prettyDate}}</itunes:summary></item>";

  app.get("/scrape", function (req, res) {
    console.log(new Date());
    console.log(req.query);

    var scrapeUrl = "http://archives.bassdrivearchive.com/" + req.query.path;
    var data = {
      scrapeTitle: req.query.title,
      scrapeUrl: scrapeUrl,
      scrapeDescription: req.query.description || req.query.title,
      currentDate: new Date().toUTCString(),
      author: "BassDrive"
    };

    var itemsToResponse = function (items) {
      var feedItems = items.map(function (item) {
        return Mustache.render(itemTemplate, item);
      });

      var feed = Mustache.render(rssStartTemplate, data) + feedItems.join(" ") + Mustache.render(rssEndTemplate, data);

      res.set("Content-Type", "application/xml");
      res.send(feed);
    };

    getItems(scrapeUrl, itemsToResponse);
  });

  app.use(express["static"](__dirname + "/"));

  app.listen(port);
}).call(undefined);
