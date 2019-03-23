"use strict";

/**************************
 * HTML5 Audio Controller *
 **************************/

var webPlayer = (function(){

    // dom of the chosen audio tag
    // must be set on page init
    var audioTagDOM = null;

    /*******************
     * Playing control *
     *******************/

    // playlist list of urls
    // player data and states
    var player = {
        index: null,
        name: null,
        list: [],
        listShuffledIndexes: []
    };
    function playlistLoaded() { return player.list.length != 0; };
    function playPause() {
        // if nothing loaded block function
        if (!playlistLoaded()) return;

        // pause or play
        if (audioTagDOM.paused) audioTagDOM.play();
        else audioTagDOM.pause();
    };
    function changePercentTime(newPercentage) {
        if (!playlistLoaded()) return;

        // get the new time from percentage
        let timeNew = (newPercentage / 100) * audioTagDOM.duration;

        // set the net current time
        audioTagDOM.currentTime = timeNew;
    };
    function changeTime(changeOffset) {
        if (!playlistLoaded()) return;
        audioTagDOM.currentTime += changeOffset;
    };
    function updateList(namePathCoupleList) {
        player.list = namePathCoupleList;
    };
    function playAudio(filePath) {
        updateAndConsumeQueue(filePath);
    };
    function playIndex() {
        // check if shuffle is on and get specific index
        let indexToPlay = (playerStates.shuffle.possible[playerStates.shuffle.state] == "on") ?
            player.listShuffledIndexes[player.index]: player.index;

        // assign the needed stuff
        player.name = player.list[player.index][0];
        playAudio(player.list[player.index][1]);
    };
    // update the player list
    function updateListPlay(namePathCoupleList, songName) {

        // update the local list
        updateList(namePathCoupleList);

        // extract the list of names
        let nameList = utils.misc.extractIndexFromBidimensionalArray(namePathCoupleList, 0);

        // play it with index
        player.index = nameList.indexOf(songName);

        // check if it is needed to shuffle the indexes
        createShuffledPlaylistIfNeeded(player.index);

        playIndex();
    }

    /*****************
     * Queue control *
     *****************/

    // queue for changing the audio source code
    var sourceQueue = {
        queue: [],
        lastConsumed: null
    };
    // consume path queue, callback and play song
    function consumeQueue() {
        audioTagDOM.src = sourceQueue.queue.pop();
        sourceQueue.queue = [];
        changeCallbacks.music();
        audioTagDOM.play();
    };
    // check if queue can be consumed already and return a success (if consumed)
    function consumeQueueIfTimed() {
        if (sourceQueue.lastConsumed === null || (Date.now() >= sourceQueue.lastConsumed + headers.player.srcConsimungInterval)) {
            consumeQueue();
            sourceQueue.lastConsumed = Date.now();
            return true;
        } else return false;
    };
    // update and consume queue if needed
    function updateAndConsumeQueue(filePath) {
        sourceQueue.queue.push(filePath);
        if (!consumeQueueIfTimed()) setTimeout(() => {
            if (sourceQueue.queue.length > 0)
                consumeQueueIfTimed();
        }, headers.player.srcConsimungInterval);
    };

    /*******************************
     * Audio HTML5 events handling *
     *******************************/

    function audioEnded() { change(1, true); };
    function durationChange() {

        // initialize some flags and vars
        let bufferEnd = 0, duration = 1;
        let lastOfTimeRanges = audioTagDOM.buffered.length - 1;

        // if there is a time range set it
        if (lastOfTimeRanges >= 0) bufferEnd = audioTagDOM.buffered.end(lastOfTimeRanges);

        // if there is a duration set it
        if (audioTagDOM.duration) duration = audioTagDOM.duration;

        // callback on the function
        changeCallbacks.musicProgress(audioTagDOM.currentTime, duration, bufferEnd);

    };
    function timeUpdate() { durationChange(); };
    function playPauseEvent() { changeCallbacks.icon("playpause"); };
    function addAudioTagListeners() {
        audioTagDOM.onended = audioEnded;
        audioTagDOM.ontimeupdate = timeUpdate;
        // audioTagDOM.onprogress = () => {};
        audioTagDOM.onpause = playPauseEvent;
        audioTagDOM.onplay = playPauseEvent;
    };

    // volume data
    var volume = {
        val: utils.startingVolume,
        lastVal: null
    };
    function changeVolume(changeOffset) {
        volume.val += changeOffset;
        // check the overflows
        volume.val = utils.misc.checkOverflow(volume.val, 0, 100);
    };
    function setExactVolume(newVolume) {
        volume.val = newVolume;
        // check the overflows
        volume.val = utils.misc.checkOverflow(volume.val, 0, 100);
    };
    function updateVolume() {
        audioTagDOM.volume = (volume.val / 100);
        changeCallbacks.musicVolume(volume.val, 100);
    };

    /********************
     * States and flags *
     ********************/

    // audio player states and its possibilities
    var playerStates = {
        repeat: {
            state: headers.player.startingStates.repeat,
            possible: [ "off", "repeatAll", "repeatOne" ],
            default: 1
        },
        shuffle: {
            state: headers.player.startingStates.shuffle,
            possible: [ "off", "on" ]
        }
    };
    function rotateState(stateName) {
        // get the maximum number of states
        let maxStates = playerStates[stateName].possible.length;

        // rotation of states
        playerStates[stateName].state = utils.misc.containExtrapolation(playerStates[stateName].state + 1, maxStates);
    };
    function change(changeNumber, automaticChange = false) {

        // check if it should run
        if (!playlistLoaded()) return;

        // init the new index
        let newIndex = player.index + changeNumber;

        // flag if is should play after
        let shouldPlay = true;

        // check if we should respect the case of repeat
        // or just use the default
        let chosenCase = automaticChange ?
            playerStates.repeat.possible[playerStates.repeat.state] :
            playerStates.repeat.possible[playerStates.repeat.default];

        // check if is the end of a playlist with the off repeat selected
        if (chosenCase == "off" && newIndex >= player.list.length) shouldPlay = false;

        // if is not repeat one update the index
        if (chosenCase != "repeatOne")
            player.index = utils.misc.containExtrapolation(newIndex, player.list.length);

        if (shouldPlay) playIndex();

    };
    function createShuffledPlaylistIfNeeded(saveIndex, buttonClick = false) {
        if (playerStates.shuffle.possible[playerStates.shuffle.state] == "on")
            player.listShuffledIndexes = utils.shuffle.index(player.list.length, saveIndex);
        else if (buttonClick && player.listShuffledIndexes.length > 0) {
            // normalize the index if changed before
            player.index = player.listShuffledIndexes[player.index];
        }
    };

    // relation of keys and codes
    var codeKey = {
        // relation of key to the javascript key down code
        relation: {
            k: 75, o: 79, i: 73, l: 76, j: 74,
            0: 48, 1: 49, 2: 50, 3: 51, 4: 52, 5: 53, 6: 54, 7: 55, 8: 56, 9: 57,
            leftArrow: 37, rightArrow: 39, upArrow: 38, downArrow: 40, comma: 188, period: 190
        },
        // relation of names to local symbol for convenience
        nameRelation: {
            playpause: "k", next: "o", previous: "i",
            forward10: "l", rewind10: "j", forward5: "period", rewind5: "comma",
            volumeup10: "upArrow", volumedown10: "downArrow",
            set0: 0, set1: 1, set2: 2, set3: 3, set4: 4,
            set5: 5, set6: 6, set7: 7, set8: 8, set9: 9
        },
        // which keys should have its normal action prevented by name
        prevention: ["upArrow", "downArrow", "leftArrow", "rightArrow"]
    };
    // function to acquire the code of the name
    function getCode(functionName) { return codeKey.relation[codeKey.nameRelation[functionName]]; };
    function preventIfNeeded(keyName, eventGiven) {
        if (codeKey.prevention.indexOf(codeKey.nameRelation[keyName]) > -1) eventGiven.preventDefault();
    };

    /****************************
     * External events triggers *
     ****************************/

    var externalEvents = {

        shuffle: function() {
            rotateState("shuffle");
            createShuffledPlaylistIfNeeded(player.index, true);
            changeCallbacks.shuffle(playerStates.shuffle.possible[playerStates.shuffle.state]);
        },
        repeat: function() {
            rotateState("repeat");
            changeCallbacks.repeat(playerStates.repeat.possible[playerStates.repeat.state]);
        },

        playPause: function() { playPause(); },

        previous: function() { change(-1); },
        next:     function() { change(1);  },

        volume: function() {
            if (volume.val != 0) {
                volume.lastVal = volume.val;
                volume.val = 0;
            } else if (volume.lastVal != null) {
                volume.val = volume.lastVal;
                volume.lastVal = null;
            } else return;
            updateVolume();
        },

        keyPress: function(keypressEvent) {
            switch (keypressEvent.which) {
                case getCode("playpause"):
                    preventIfNeeded("playpause", keypressEvent);
                    playPause();
                    break;
                case getCode("next"):
                    preventIfNeeded("next", keypressEvent);
                    change(1);
                    break;
                case getCode("previous"):
                    preventIfNeeded("previous", keypressEvent);
                    change(-1);
                    break;
                case getCode("forward10"):
                    preventIfNeeded("forward10", keypressEvent);
                    changeTime(10);
                    break;
                case getCode("rewind10"):
                    preventIfNeeded("rewind10", keypressEvent);
                    changeTime(-10);
                    break;
                case getCode("forward5"):
                    preventIfNeeded("forward5", keypressEvent);
                    changeTime(5);
                    break;
                case getCode("rewind5"):
                    preventIfNeeded("rewind5", keypressEvent);
                    changeTime(-5);
                    break;
                case getCode("volumeup10"):
                    preventIfNeeded("volumeup10", keypressEvent);
                    changeVolume(10);
                    updateVolume();
                    break;
                case getCode("volumedown10"):
                    preventIfNeeded("volumedown10", keypressEvent);
                    changeVolume(-10);
                    updateVolume();
                    break;
                case getCode("set1"):
                    preventIfNeeded("set1", keypressEvent);
                    changePercentTime(10);
                    break;
                case getCode("set2"):
                    preventIfNeeded("set2", keypressEvent);
                    changePercentTime(20);
                    break;
                case getCode("set3"):
                    preventIfNeeded("set3", keypressEvent);
                    changePercentTime(30);
                    break;
                case getCode("set4"):
                    preventIfNeeded("set4", keypressEvent);
                    changePercentTime(40);
                    break;
                case getCode("set5"):
                    preventIfNeeded("set5", keypressEvent);
                    changePercentTime(50);
                    break;
                case getCode("set6"):
                    preventIfNeeded("set6", keypressEvent);
                    changePercentTime(60);
                    break;
                case getCode("set7"):
                    preventIfNeeded("set7", keypressEvent);
                    changePercentTime(70);
                    break;
                case getCode("set8"):
                    preventIfNeeded("set8", keypressEvent);
                    changePercentTime(80);
                    break;
                case getCode("set9"):
                    preventIfNeeded("set9", keypressEvent);
                    changePercentTime(90);
                    break;
                case getCode("set0"):
                    preventIfNeeded("set0", keypressEvent);
                    changePercentTime(0);
                    break;
            }
        }
    };

    /****************************
     * Callbacks to the outside *
     ****************************/

    // functions that will be called when a specific local event happens
    var changeCallbacks = {
        // callback when the music source is changed
        music: utils.misc.empty,
        // callback for when a icon is changed
        icon: utils.misc.empty,
        // music progress and volume changed callback
        // for progress bars
        musicProgress: utils.misc.empty,
        musicVolume: utils.misc.empty,
        // shuffle and repeat callback
        shuffle: utils.misc.empty,
        repeat: utils.misc.empty
    }

    /*********************************************
     * Data that will be available to the module *
     *********************************************/

    // public stuff to be returned
    var publicReturn = {

        // init function that must be run from browser
        initFromBrowser: function(audioDOM, callbackFunctionsObject) {

            // get the main audio tag dom from page
            audioTagDOM = audioDOM;

            // assing all specific callbacks
            // the input object must match the change callbacks in keys to be assigned
            let changeCallbacksKeys = Object.keys(changeCallbacks);
            for (let i = 0; i < changeCallbacksKeys.length; ++i)
                changeCallbacks[changeCallbacksKeys[i]] = callbackFunctionsObject[changeCallbacksKeys[i]];

            // add the local listeneds to the freshly acquired dom
            addAudioTagListeners();

            // return the functions for button presses
            return externalEvents;

        },

        // few mirror var fns
        getVar: {
            source: function() { return audioTagDOM.src; },
            paused: function() { return audioTagDOM.paused; },
            name:   function() { return player.name; }
        },

        // available functions
        updateListPlay: function() { updateListPlay.apply(null, arguments) },
        changePercentTime: function() { changePercentTime.apply(null, arguments) },
        setExactVolume: function(exactPercentage) {
            setExactVolume(exactPercentage);
            updateVolume();
        },

    };

    return publicReturn;

}());
