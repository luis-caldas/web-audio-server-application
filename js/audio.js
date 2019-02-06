"use strict";

/*********
 * Utils *
 *********/

const extractIndexFromBidimensionalArray = (bidimensionalArray, index) => {
    let tempArray = [];
    for (let i = 0; i < bidimensionalArray.length; ++i)
        tempArray.push(bidimensionalArray[i][index]);
    return tempArray;
};

const emptyFunction = function() {};

/***********
 * Objects *
 ***********/

// web player class
// for controlling the audio tag with html5 calls
var webPlayer = {

    /*************
     * Variables *
     *************/

    // playlist list of urls
    playingIndex: null,
    playingName: null,
    playlist: [],
    playlistShuffled: [],

    // dom of the chosen audio tag
    audioTagDOM: null,

    // volume
    volume: 100.0,

    // few audio player states and its possibilities
    playerStates: {
        repeat: 1
    },
    playerStatesPossibilities: {
        repeat: [
            "off",
            "repeatAll",
            "repeatOne"
        ]
    },

    // relation of keys and codes
    codeKeyRelation: {
        k: 75,
        o: 79,
        i: 73,
        l: 76,
        j: 74,
        leftArrow: 37,
        rightArrow: 39,
        upArrow: 38,
        downArrow: 40,
        comma: 188,
        period: 190
    },
    keyFunctionRelation: {
        playpause: "k",
        next: "o",
        previous: "i",
        forward10: "l",
        rewind10: "j",
        forward5: "period",
        rewind5: "comma",
        volumeup10: "upArrow",
        volumedown10: "downArrow"
    },

    // function that will be called on music change
    musicChangedCallback: emptyFunction

};

/*************
 * Functions *
 *************/

webPlayer.init = function() {};

webPlayer.getCode = function(functionName) {
    return webPlayer.codeKeyRelation[webPlayer.keyFunctionRelation[functionName]];
};

webPlayer.playPause = function() {
    if (webPlayer.audioTagDOM.paused) webPlayer.audioTagDOM.play();
    else webPlayer.audioTagDOM.pause();
};

webPlayer.changeTime = function(changeOffset) {
    webPlayer.audioTagDOM.currentTime += changeOffset;
};

webPlayer.updateList = function(namePathCoupleList) {
    webPlayer.playlist = namePathCoupleList;
};

webPlayer.playAudio = function(filePath) {
    webPlayer.musicChangedCallback();
    webPlayer.audioTagDOM.src = filePath;
    webPlayer.audioTagDOM.play();
};

webPlayer.playIndex = function() {
    webPlayer.playingName = webPlayer.playlist[webPlayer.playingIndex][0];
    webPlayer.playAudio(webPlayer.playlist[webPlayer.playingIndex][1]);
};

webPlayer.next = function() {
    let newIndex = 0;
    newIndex = webPlayer.playingIndex + 1;
    if (newIndex >= webPlayer.playlist.length) newIndex = 0;
    webPlayer.playingIndex = newIndex;
    webPlayer.playIndex();
};

webPlayer.previous = function() {
    let newIndex = 0;
    newIndex = webPlayer.playingIndex - 1;
    if (newIndex < 0) newIndex = webPlayer.playlist.length - 1;
    webPlayer.playingIndex = newIndex;
    webPlayer.playIndex();
};

webPlayer.audioEnded = function() {
    webPlayer.next();
};

webPlayer.addEndedListener = function() {
    webPlayer.audioTagDOM.onended = webPlayer.audioEnded;
};

webPlayer.updateListPlay = function(namePathCoupleList, songName) {

    // update the local list
    webPlayer.updateList(namePathCoupleList);

    // extract the list of names
    let nameList = extractIndexFromBidimensionalArray(namePathCoupleList, 0);

    // play it with index
    webPlayer.playingIndex = nameList.indexOf(songName);
    webPlayer.playIndex();
};

webPlayer.changeVolume = function(changeOffset) {
    webPlayer.volume += changeOffset;
    // check the overflows
    if (webPlayer.volume > 100) webPlayer.volume = 100;
    else if (webPlayer.volume < 0) webPlayer.volume = 0;
};

webPlayer.updateVolume = function() {
    webPlayer.audioTagDOM.volume = (webPlayer.volume / 100);
};

webPlayer.keypressFunction = function(keypressEvent) {
    switch (keypressEvent.which) {
        case webPlayer.getCode("playpause"):
            webPlayer.playPause();
            break;
        case webPlayer.getCode("next"):
            webPlayer.next();
            break;
        case webPlayer.getCode("previous"):
            webPlayer.previous();
            break;
        case webPlayer.getCode("forward10"):
            webPlayer.changeTime(10);
            break;
        case webPlayer.getCode("rewind10"):
            webPlayer.changeTime(-10);
            break;
        case webPlayer.getCode("forward5"):
            webPlayer.changeTime(5);
            break;
        case webPlayer.getCode("rewind5"):
            webPlayer.changeTime(-5);
            break;
        case webPlayer.getCode("volumeup10"):
            keypressEvent.preventDefault();
            webPlayer.changeVolume(10);
            webPlayer.updateVolume();
            break;
        case webPlayer.getCode("volumedown10"):
            keypressEvent.preventDefault();
            webPlayer.changeVolume(-10);
            webPlayer.updateVolume();
            break;
        default:
    }
};

/******************
 * Initialization *
 ******************/

webPlayer.init();
