
String.similarity = function (s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (
        (longerLength - String.editDistance(longer, shorter)) / parseFloat(longerLength)
    );
}
String.editDistance = function (s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}
    
String.prototype.toTitleCase = function (splitter) {
    if (!splitter) {
        splitter = " ";
    }
    return this
        .toLowerCase()
        .split(splitter)
        .map(s => s.charAt(0).toUpperCase() + s.substring(1))
        .join(splitter);
}
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};
String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
String.prototype.limitTo = function (limit) {
    if (this.length <= limit) {
        return this;
    }
    return this.substring(0, limit) + "...";
};
String.prototype.empty = function () {
    return this.length === 0 || !/\S/.test(this);
};
String.prototype.indexOfAfter = function (search, start) {
    var string = this;
    var preIndex = string.indexOf(start);
    return preIndex + string.substring(preIndex).indexOf(search);
};
String.prototype.indexOfAfterIndex = function (search, start) {
    return start + this.substring(start).indexOf(search);
};
String.prototype.matches = function (other) {
    return this === other;
};

module.exports = String;