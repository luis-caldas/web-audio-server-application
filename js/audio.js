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
    function updateByIndex(shouldPlay = true) {
        // check if shuffle is on and get specific index
        let indexToPlay = (playerStates.shuffle.possible[playerStates.shuffle.state] == "on") ?
            player.listShuffledIndexes[player.index]: player.index;

        // assign the needed stuff
        player.name = player.list[indexToPlay][0];
        updateAndConsumeQueue(player.list[indexToPlay][1], shouldPlay);
    };
    // update the player list
    function updateListPlay(namePathCoupleList, songIndex) {

        // update the local list
        player.list = namePathCoupleList;
        // play it with index
        player.index = songIndex;

        // check if it is needed to shuffle the indexes
        createShuffledPlaylistIfNeeded();

        updateByIndex();
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
        // [filePath, should the file be played as well]
        let tupleData = sourceQueue.queue.pop();
        audioTagDOM.src = tupleData[0];
        sourceQueue.queue = [];
        changeCallbacks.music(player.name, tupleData[0]);
        if (tupleData[1]) audioTagDOM.play();
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
    function updateAndConsumeQueue(filePath, shouldPlay) {
        sourceQueue.queue.push([filePath, shouldPlay]);
        if (!consumeQueueIfTimed()) setTimeout(() => {
            if (sourceQueue.queue.length > 0)
                consumeQueueIfTimed();
        }, headers.player.srcConsimungInterval);
    };

    /*******************************
     * Audio HTML5 events handling *
     *******************************/

    function audioEnded() { changeTrack(1, true); };
    // send the music change callback to the page
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
    function playPauseEvent() { changeCallbacks.icon("playpause", audioTagDOM.paused); };
    function addAudioTagListeners() {
        audioTagDOM.onended = audioEnded;
        audioTagDOM.ontimeupdate = timeUpdate;
        // audioTagDOM.onprogress = () => {};
        audioTagDOM.onpause = playPauseEvent;
        audioTagDOM.onplay = playPauseEvent;
    };

    /***********************
     * Volume data control *
     ***********************/

    var volume = {
        val: utils.startingVolume,
        lastVal: null
    };
    function updateVolume() {
        audioTagDOM.volume = (volume.val / 100);
        changeCallbacks.musicVolume(volume.val, 100);
    };
    function changeVolume(changeOffset) {
        volume.val += changeOffset;
        // check the overflows
        volume.val = utils.misc.checkOverflow(volume.val, 0, 100);

        updateVolume();
    };
    function setExactVolume(newVolume) {
        volume.val = newVolume;
        // check the overflows
        volume.val = utils.misc.checkOverflow(volume.val, 0, 100);

        updateVolume();
    };
    function volumeStoreChange() {
        if (volume.val != 0) {
            volume.lastVal = volume.val;
            volume.val = 0;
        } else if (volume.lastVal != null) {
            volume.val = volume.lastVal;
            volume.lastVal = null;
        }

        updateVolume();
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
    function shuffleHit() {
        rotateState("shuffle");
        createShuffledPlaylistIfNeeded(true);
        changeCallbacks.shuffle(playerStates.shuffle.possible[playerStates.shuffle.state]);
    };
    function repeatHit() {
        rotateState("repeat");
        changeCallbacks.repeat(playerStates.repeat.possible[playerStates.repeat.state]);
    };
    function changeTrack(changeNumber, automaticChange = false) {

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

        updateByIndex(shouldPlay);

    };
    function createShuffledPlaylistIfNeeded(buttonClick = false) {
        if (playerStates.shuffle.possible[playerStates.shuffle.state] == "on")
            player.listShuffledIndexes = utils.shuffle.indexToBeginning(player.list.length, player.index);
        else if (buttonClick && player.listShuffledIndexes.length > 0) {
            // normalize the index if changed before
            player.index = player.listShuffledIndexes[0];
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
        prevention: ["upArrow", "downArrow", "leftArrow", "rightArrow"],
        // function of each key
        function: {
            playpause:      function() { playPause(); },
            next:           function() { changeTrack(1); },
            previous:       function() { changeTrack(-1); },
            forward10:      function() { changeTime(10); },
            rewind10:       function() { changeTime(-10); },
            forward5:       function() { changeTime(5); },
            rewind5:        function() { changeTime(-5); },
            volumeup10:     function() { changeVolume(10); },
            volumedown10:   function() { changeVolume(-10); },
            set0:           function() { changePercentTime(0); },
            set1:           function() { changePercentTime(10); },
            set2:           function() { changePercentTime(20); },
            set3:           function() { changePercentTime(30); },
            set4:           function() { changePercentTime(40); },
            set5:           function() { changePercentTime(50); },
            set6:           function() { changePercentTime(60); },
            set7:           function() { changePercentTime(70); },
            set8:           function() { changePercentTime(80); },
            set9:           function() { changePercentTime(90); }
        }
    };
    // find name from key number
    function nameFromKeyNumber(number) {

        // get the key from the name relation object
        let nameList = Object.keys(codeKey.nameRelation);

        // iterate and find the name
        for (let i = 0; i < nameList.length; ++i)
            if (codeKey.relation[codeKey.nameRelation[nameList[i]]] == number) return nameList[i];

        // nothing found
        return null;
    };
    // function to prevent a keys default action if it is needed
    function preventIfNeeded(keyName, eventGiven) {
        if (codeKey.prevention.indexOf(codeKey.nameRelation[keyName]) > -1) eventGiven.preventDefault();
    };

    /****************************
     * External events triggers *
     ****************************/

    // events that are bound from the outside
    var externalEvents = {

        shuffle: function() { shuffleHit(); },
        repeat: function() { repeatHit(); },

        playPause: function() { playPause(); },

        previous: function() { changeTrack(-1); },
        next:     function() { changeTrack(1);  },

        volume: function() { volumeStoreChange(); },

        keyPress: function(keypressEvent) {

            // extract name from code
            let nameNow = nameFromKeyNumber(keypressEvent.which);

            if (nameNow !== null) {
                // prevent if needed the key
                preventIfNeeded(nameNow, keypressEvent);

                // run needed function
                codeKey.function[nameNow]();
            }

        }
    };

    /****************************
     * Callbacks to the outside *
     ****************************/

    // functions that will be called when a specific local event happens
    // have to be assinged on the init
    var changeCallbacks = {
        // callback when the music source is changed
        // [song_name]
        music: utils.misc.empty,
        // callback for when a icon is changed
        // [string_identifying_the_button, button_state]
        icon: utils.misc.empty,
        // music progress and volume changed callback
        // for progress bars
        // [current_time, total_time, buffe_time] (all in float seconds)
        musicProgress: utils.misc.empty,
        // [volume_now, volume_total]
        musicVolume: utils.misc.empty,
        // shuffle and repeat callback
        // [shuffle_state_string]
        shuffle: utils.misc.empty,
        // [repeat_state_string]
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
            // add the local listeneds to the freshly acquired dom
            addAudioTagListeners();

            // assing all specific callbacks
            // the input object must match the change callbacks in keys to be assigned
            let changeCallbacksKeys = Object.keys(changeCallbacks);
            for (let i = 0; i < changeCallbacksKeys.length; ++i)
                changeCallbacks[changeCallbacksKeys[i]] = callbackFunctionsObject[changeCallbacksKeys[i]];

            // return the functions for button presses
            return externalEvents;

        },

        // available functions
        updateListAndPlay:        function(listCouple, itemClicked) { updateListPlay(listCouple, itemClicked); },
        setExactTimePercentage:   function(exactPercentage)         { changePercentTime(exactPercentage); },
        setExactVolumePercentage: function(exactPercentage)         { setExactVolume(exactPercentage); }

    };

    return publicReturn;

}());
