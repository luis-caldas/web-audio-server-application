"use strict";

/*
 * Easy manipulation of keypresses and events
 */

var localKeys = (function(){

    // relation of keys and codes
    var keyFunctions = {
        // relation of key to the javascript key down code
        relation: {
            k: 75, o: 79, i: 73, l: 76, j: 74, r: 82,
            0: 48, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54, 7: 55, 8: 56, 9: 57,
            leftArrow: 37, rightArrow: 39, upArrow: 38, downArrow: 40, comma: 188, period: 190
        },
        // relation of names to local symbol for convenience
        nameRelation: {
            playpause: "k", next: "o", previous: "i",
            forward10: "l", rewind10: "j", forward5: "period", rewind5: "comma",
            volumeup10: "upArrow", volumedown10: "downArrow",
            set0: 0, set1: 1, set2: 2, set3: 3, set4: 4,
            set5: 5, set6: 6, set7: 7, set8: 8, set9: 9,
            return: "r"
        },
        // which keys should have its normal action prevented by name
        prevention: ["upArrow", "downArrow", "leftArrow", "rightArrow"],
        // key functions
        function: {
            playpause:      function() { webPlayer.control.playPause(); },
            next:           function() { webPlayer.control.trackOffset(1); },
            previous:       function() { webPlayer.control.trackOffset(-1); },
            forward10:      function() { webPlayer.control.timeOffset(10); },
            rewind10:       function() { webPlayer.control.timeOffset(-10); },
            forward5:       function() { webPlayer.control.timeOffset(5); },
            rewind5:        function() { webPlayer.control.timeOffset(-5); },
            volumeup10:     function() { webPlayer.control.volumeOffset(10); },
            volumedown10:   function() { webPlayer.control.volumeOffset(-10); },
            set0:           function() { webPlayer.control.timeSet(0); },
            set1:           function() { webPlayer.control.timeSet(10); },
            set2:           function() { webPlayer.control.timeSet(20); },
            set3:           function() { webPlayer.control.timeSet(30); },
            set4:           function() { webPlayer.control.timeSet(40); },
            set5:           function() { webPlayer.control.timeSet(50); },
            set6:           function() { webPlayer.control.timeSet(60); },
            set7:           function() { webPlayer.control.timeSet(70); },
            set8:           function() { webPlayer.control.timeSet(80); },
            set9:           function() { webPlayer.control.timeSet(90); },
            return:         function() { returnButton(); }
        }
    };

    // find name from key number
    function nameFromKeyNumber(number) {

        // get the key from the name relation object
        let nameList = Object.keys(keyFunctions.nameRelation);

        // iterate and find the name
        for (let i = 0; i < nameList.length; ++i)
            if (keyFunctions.relation[keyFunctions.nameRelation[nameList[i]]] == number) return nameList[i];

        // nothing found
        return null;
    };
    // function to prevent a keys default action if it is needed
    function preventIfNeeded(keyName, eventGiven) {
        if (keyFunctions.prevention.indexOf(keyFunctions.nameRelation[keyName]) > -1) eventGiven.preventDefault();
    };
    function keypressCall(keypressEvent) {

        // extract name from code
        let nameNow = nameFromKeyNumber(keypressEvent.which);
        if (nameNow !== null) {
            // prevent if needed the key
            preventIfNeeded(nameNow, keypressEvent);
            // run needed function
            keyFunctions.function[nameNow]();
        }
    };

    // public stuff
    return {
        keypressEventCall: function(event) { keypressCall(event); }
    };

}());
