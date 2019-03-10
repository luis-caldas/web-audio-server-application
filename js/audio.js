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
    playlistShuffledIndexes: [],

    // dom of the chosen audio tag
    audioTagDOM: null,

    // volume
    volume: 100.0,
    volumeLastState: null,

    // add a queue for changing the audio source code
    srcChangeQueue: [],
    srcLastConsumed: null,
    srcConsimungInterval: 250,  // miliseconds

    // few audio player states and its possibilities
    playerStates: {
        repeat: 1,
        shuffle: 0
    },
    playerStatesPossibilities: {
        repeat: [
            "off",
            "repeatAll",
            "repeatOne"
        ],
        shuffle: [
            "off",
            "on"
        ]
    },

    // relation of keys and codes
    codeKeyRelation: {
        k: 75,
        o: 79,
        i: 73,
        l: 76,
        j: 74,
        1: 49,
        2: 50,
        3: 51,
        4: 52,
        5: 53,
        6: 54,
        7: 55,
        8: 56,
        9: 57,
        0: 48,
        leftArrow: 37,
        rightArrow: 39,
        upArrow: 38,
        downArrow: 40,
        comma: 188,
        period: 190
    },
    codeKeyPrevention: ["upArrow", "downArrow", "leftArrow", "rightArrow"],
    keyFunctionRelation: {
        playpause: "k",
        next: "o",
        previous: "i",
        forward10: "l",
        rewind10: "j",
        forward5: "period",
        rewind5: "comma",
        volumeup10: "upArrow",
        volumedown10: "downArrow",
        set1: 1,
        set2: 2,
        set3: 3,
        set4: 4,
        set5: 5,
        set6: 6,
        set7: 7,
        set8: 8,
        set9: 9,
        set0: 0
    },

    // function that will be called on music change
    musicChangedCallback: emptyFunction,

    // object with callbacks for icon change
    iconChangeCallback: emptyFunction,

    // music progress and volume bars changed callback
    musicProgressChangeCallback: emptyFunction,
    musicVolumeChangeCallback: emptyFunction,

    // shuffle and repeat callback
    shuffleChangeCallback: emptyFunction,
    repeatChangeCallback: emptyFunction

};

/*************
 * Functions *
 *************/

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function shuffle(array) {
    let counter = array.length;

    // while there are elements in the array
    while (counter > 0) {

        // pick a random index
        let index = Math.floor(Math.random() * counter);

        --counter;

        // swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}

function shuffleIndex(totalArrayLength, indexToMaintain) {
    // create array of indexes
    let artificialIndexes = [];
    for (let i = 0; i < totalArrayLength; ++i) artificialIndexes.push(i);

    // scramble the artificial indexes
    let shuffledArray = shuffle(artificialIndexes);

    // return the mantained index to its rightfull location
    shuffledArray[shuffledArray.indexOf(indexToMaintain)] = shuffledArray[indexToMaintain];
    shuffledArray[indexToMaintain] = indexToMaintain;

    return shuffledArray;
}

webPlayer.init = function() {};

webPlayer.playlistLoaded = function() {
    return webPlayer.playlist.length != 0;
};

webPlayer.getCode = function(functionName) {
    return webPlayer.codeKeyRelation[webPlayer.keyFunctionRelation[functionName]];
};

webPlayer.preventIfNeeded = function(keyFunctionName, eventNow) {
    if (webPlayer.codeKeyPrevention.indexOf(webPlayer.keyFunctionRelation[keyFunctionName]) > -1)
        eventNow.preventDefault();
};

webPlayer.playPause = function() {
    if (!webPlayer.playlistLoaded()) return;
    if (webPlayer.audioTagDOM.paused) webPlayer.audioTagDOM.play();
    else webPlayer.audioTagDOM.pause();
};

webPlayer.changePercentTime = function(newPercentage) {
    if (!webPlayer.playlistLoaded()) return;

    // get the new time from percentage
    let timeNew = (newPercentage / 100) * webPlayer.audioTagDOM.duration;

    // set the net current time
    webPlayer.audioTagDOM.currentTime = timeNew;
};

webPlayer.changeTime = function(changeOffset) {
    if (!webPlayer.playlistLoaded()) return;
    webPlayer.audioTagDOM.currentTime += changeOffset;
};

webPlayer.updateList = function(namePathCoupleList) {
    webPlayer.playlist = namePathCoupleList;
};

webPlayer.consumeQueue = async function() {
    webPlayer.musicChangedCallback();
    webPlayer.audioTagDOM.src = webPlayer.srcChangeQueue.pop();
    webPlayer.srcChangeQueue = [];
    webPlayer.audioTagDOM.play();
};

webPlayer.consumeQueueIfTimed = function() {
    if (webPlayer.srcLastConsumed === null || (Date.now() >= webPlayer.srcLastConsumed + webPlayer.srcConsimungInterval)) {
        webPlayer.consumeQueue();
        webPlayer.srcLastConsumed = Date.now();
        return true;
    } else return false;
};

webPlayer.updateAndConsumeQueue = function(filePath) {
    webPlayer.srcChangeQueue.push(filePath);
    if (!webPlayer.consumeQueueIfTimed()) setTimeout(() => {
        if (webPlayer.srcChangeQueue.length > 0)
            webPlayer.consumeQueueIfTimed();
    }, webPlayer.srcConsimungInterval);
};

webPlayer.playAudio = function(filePath) {
    webPlayer.updateAndConsumeQueue(filePath);
};

webPlayer.playIndex = function() {
    // check if shuffle is on
    let indexToPlay = (webPlayer.playerStatesPossibilities.shuffle[webPlayer.playerStates.shuffle] == "on") ?
        webPlayer.playlistShuffledIndexes[webPlayer.playingIndex]: webPlayer.playingIndex;

    webPlayer.playingName = webPlayer.playlist[indexToPlay][0];
    webPlayer.playAudio(webPlayer.playlist[indexToPlay][1]);
};

webPlayer.next = function(respectRepeat = false) {
    if (!webPlayer.playlistLoaded()) return;

    let newIndex = 0;
    let respectedCase = respectRepeat ?
        webPlayer.playerStatesPossibilities.repeat[webPlayer.playerStates.repeat] :
        "repeatAll";

    switch (respectedCase) {
        case "off":
            newIndex = webPlayer.playingIndex + 1;
            if (newIndex >= webPlayer.playlist.length) newIndex = 0;
            else {
                webPlayer.playingIndex = newIndex;
                webPlayer.playIndex();
            }
            break;
        case "repeatAll":
            newIndex = webPlayer.playingIndex + 1;
            if (newIndex >= webPlayer.playlist.length) newIndex = 0;
            webPlayer.playingIndex = newIndex;
            webPlayer.playIndex();
            break;
        case "repeatOne":
            webPlayer.playIndex();
            break;
        default:
    }

};

webPlayer.previous = function(respectRepeat) {
    if (!webPlayer.playlistLoaded()) return;

    let newIndex = 0;
    let respectedCase = respectRepeat ?
        webPlayer.playerStatesPossibilities.repeat[webPlayer.playerStates.repeat] :
        "repeatAll";

    switch (respectedCase) {
        case "off":
            newIndex = webPlayer.playingIndex - 1;
            if (newIndex < 0) newIndex = webPlayer.playlist.length - 1;
            else {
                webPlayer.playingIndex = newIndex;
                webPlayer.playIndex();
            }
            break;
        case "repeatAll":
            newIndex = webPlayer.playingIndex - 1;
            if (newIndex < 0) newIndex = webPlayer.playlist.length - 1;
            webPlayer.playingIndex = newIndex;
            webPlayer.playIndex();
            break;
        case "repeatOne":
            webPlayer.playIndex();
            break;
        default:
    }

};

webPlayer.audioEnded = function() {
    webPlayer.next(true);
};

webPlayer.timeUpdate = function() {
    webPlayer.durationChange();
};

webPlayer.bufferUpdate = function() {
    webPlayer.durationChange();
};

webPlayer.durationChange = function() {

    // initialize some flags and vars
    let bufferEnd = 0, duration = 1;
    let lastOfTimeRanges = webPlayer.audioTagDOM.buffered.length - 1;

    // if there is a time range set it
    if (lastOfTimeRanges >= 0)
        bufferEnd = webPlayer.audioTagDOM.buffered.end(lastOfTimeRanges);

    // if there is a duration set it
    if (webPlayer.audioTagDOM.duration)
        duration = webPlayer.audioTagDOM.duration;

    webPlayer.musicProgressChangeCallback(
        webPlayer.audioTagDOM.currentTime,
        duration,
        bufferEnd
    );

};

webPlayer.playPauseEvent = function() {
    webPlayer.iconChangeCallback("playpause");
};

webPlayer.addAudioTagListeners = function() {
    webPlayer.audioTagDOM.onended = webPlayer.audioEnded;
    webPlayer.audioTagDOM.ontimeupdate = webPlayer.timeUpdate;
    webPlayer.audioTagDOM.onprogress = webPlayer.downloadingData;
    webPlayer.audioTagDOM.onpause = webPlayer.playPauseEvent;
    webPlayer.audioTagDOM.onplay = webPlayer.playPauseEvent;
};

webPlayer.updateListPlay = function(namePathCoupleList, songName) {

    // update the local list
    webPlayer.updateList(namePathCoupleList);

    // extract the list of names
    let nameList = extractIndexFromBidimensionalArray(namePathCoupleList, 0);

    // play it with index
    webPlayer.playingIndex = nameList.indexOf(songName);

    // check if it is needed to shuffle the indexes
    webPlayer.createShuffledPlaylistIfNeeded(webPlayer.playingIndex);

    webPlayer.playIndex();
};

webPlayer.changeVolume = function(changeOffset) {
    webPlayer.volume += changeOffset;
    // check the overflows
    if (webPlayer.volume > 100) webPlayer.volume = 100;
    else if (webPlayer.volume < 0) webPlayer.volume = 0;
};

webPlayer.setExactVolume = function(newVolume) {
    webPlayer.volume = newVolume;
    // check the overflows
    if (webPlayer.volume > 100) webPlayer.volume = 100;
    else if (webPlayer.volume < 0) webPlayer.volume = 0;
};

webPlayer.updateVolume = function() {
    webPlayer.audioTagDOM.volume = (webPlayer.volume / 100);
    webPlayer.musicVolumeChangeCallback(webPlayer.volume, 100);
};

webPlayer.createShuffledPlaylistIfNeeded = function(saveIndex, buttonClick = false) {
    if (webPlayer.playerStatesPossibilities.shuffle[webPlayer.playerStates.shuffle] == "on")
        webPlayer.playlistShuffledIndexes = shuffleIndex(webPlayer.playlist.length, saveIndex);
    else if (buttonClick && webPlayer.playlistShuffledIndexes.length > 0) {
        // normalize the index if changed before
        webPlayer.playingIndex = webPlayer.playlistShuffledIndexes[webPlayer.playingIndex];
    }
};

webPlayer.rotateState = function(stateName) {
    // get the maximum number of states
    let maxStates = webPlayer.playerStatesPossibilities[stateName].length;

    // rotation always 1 up
    webPlayer.playerStates[stateName] += 1

    // check for overflow and rotate it
    if (webPlayer.playerStates[stateName] >= maxStates)
        webPlayer.playerStates[stateName] = 0;
};

webPlayer.buttonPressShuffle = function() {
    webPlayer.rotateState("shuffle");
    webPlayer.createShuffledPlaylistIfNeeded(webPlayer.playingIndex, true);
    webPlayer.shuffleChangeCallback(webPlayer.playerStatesPossibilities.shuffle[webPlayer.playerStates.shuffle]);
};

webPlayer.buttonPressRepeat = function() {
    webPlayer.rotateState("repeat");
    webPlayer.repeatChangeCallback(webPlayer.playerStatesPossibilities.repeat[webPlayer.playerStates.repeat]);
};

webPlayer.buttonPressPlayPause = function() {
    webPlayer.playPause();
};

webPlayer.buttonPressPrevious = function() {
    webPlayer.previous();
};

webPlayer.buttonPressNext = function() {
    webPlayer.next();
};

webPlayer.buttonPressVolume = function() {
    if (webPlayer.volume != 0) {
        webPlayer.volumeLastState = webPlayer.volume;
        webPlayer.volume = 0;
        webPlayer.updateVolume();
    } else if (webPlayer.volumeLastState != null) {
        webPlayer.volume = webPlayer.volumeLastState;
        webPlayer.volumeLastState = null;
        webPlayer.updateVolume();
    }
}

webPlayer.keyPressFunction = function(keypressEvent) {
    switch (keypressEvent.which) {
        case webPlayer.getCode("playpause"):
            webPlayer.preventIfNeeded("playpause", keypressEvent);
            webPlayer.playPause();
            break;
        case webPlayer.getCode("next"):
            webPlayer.preventIfNeeded("next", keypressEvent);
            webPlayer.next();
            break;
        case webPlayer.getCode("previous"):
            webPlayer.preventIfNeeded("previous", keypressEvent);
            webPlayer.previous();
            break;
        case webPlayer.getCode("forward10"):
            webPlayer.preventIfNeeded("forward10", keypressEvent);
            webPlayer.changeTime(10);
            break;
        case webPlayer.getCode("rewind10"):
            webPlayer.preventIfNeeded("rewind10", keypressEvent);
            webPlayer.changeTime(-10);
            break;
        case webPlayer.getCode("forward5"):
            webPlayer.preventIfNeeded("forward5", keypressEvent);
            webPlayer.changeTime(5);
            break;
        case webPlayer.getCode("rewind5"):
            webPlayer.preventIfNeeded("rewind5", keypressEvent);
            webPlayer.changeTime(-5);
            break;
        case webPlayer.getCode("volumeup10"):
            webPlayer.preventIfNeeded("volumeup10", keypressEvent);
            webPlayer.changeVolume(10);
            webPlayer.updateVolume();
            break;
        case webPlayer.getCode("volumedown10"):
            webPlayer.preventIfNeeded("volumedown10", keypressEvent);
            webPlayer.changeVolume(-10);
            webPlayer.updateVolume();
            break;
        case webPlayer.getCode("set1"):
            webPlayer.preventIfNeeded("set1", keypressEvent);
            webPlayer.changePercentTime(10);
            break;
        case webPlayer.getCode("set2"):
            webPlayer.preventIfNeeded("set2", keypressEvent);
            webPlayer.changePercentTime(20);
            break;
        case webPlayer.getCode("set3"):
            webPlayer.preventIfNeeded("set3", keypressEvent);
            webPlayer.changePercentTime(30);
            break;
        case webPlayer.getCode("set4"):
            webPlayer.preventIfNeeded("set4", keypressEvent);
            webPlayer.changePercentTime(40);
            break;
        case webPlayer.getCode("set5"):
            webPlayer.preventIfNeeded("set5", keypressEvent);
            webPlayer.changePercentTime(50);
            break;
        case webPlayer.getCode("set6"):
            webPlayer.preventIfNeeded("set6", keypressEvent);
            webPlayer.changePercentTime(60);
            break;
        case webPlayer.getCode("set7"):
            webPlayer.preventIfNeeded("set7", keypressEvent);
            webPlayer.changePercentTime(70);
            break;
        case webPlayer.getCode("set8"):
            webPlayer.preventIfNeeded("set8", keypressEvent);
            webPlayer.changePercentTime(80);
            break;
        case webPlayer.getCode("set9"):
            webPlayer.preventIfNeeded("set9", keypressEvent);
            webPlayer.changePercentTime(90);
            break;
        case webPlayer.getCode("set0"):
            webPlayer.preventIfNeeded("set0", keypressEvent);
            webPlayer.changePercentTime(0);
            break;
        default:
    }
};

/******************
 * Initialization *
 ******************/

webPlayer.init();
