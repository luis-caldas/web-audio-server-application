"use strict";

/**************************
 * HTML5 Audio Controller *
 **************************/

var webPlayer = (function(){

    /*
     * Audio tag DOM
     */

    // dom of the chosen audio tag
    // must be set on page init
    var audioTagDOM = null;

    /*
     * Player variables
     */

    // playlist list of urls
    // player data and states
    var player = {
        init: false,
        index: null,
        name: null,
        list: [],
        listShuffledIndexes: []
    };
    // queue for changing the audio source code
    var sourceQueue = {
        queue: [],
        lastConsumed: null
    };
    // volume data
    var volume = {
        val: utils.startingVolume,
        lastVal: null
    };
    // audio player states and its possibilities
    var playerStates = {
        repeat: {
            state: header.player.startingStates.repeat,
            possible: [ "off", "repeatAll", "repeatOne" ],
            default: 1
        },
        shuffle: {
            state: header.player.startingStates.shuffle,
            possible: [ "off", "on" ]
        }
    };

    /*
     * Song state control
     */

    function playPause() {
        // if nothing loaded block function
        if (!player.init) return;

        // pause or play
        if (audioTagDOM.paused) audioTagDOM.play();
        else audioTagDOM.pause();
    };

    /*
     * Song time control
     */

    function timeOffset(changeOffset) {
        if (!player.init) return;
        audioTagDOM.currentTime += changeOffset;
    };
    function timeSet(newPercentage) {
        if (!player.init) return;

        // get the new time from percentage
        let timeNew = (newPercentage / 100) * audioTagDOM.duration;

        // set the net current time
        audioTagDOM.currentTime = timeNew;
    };

    /*
     * Player playlist and track control
     */

    // consume path queue, callback and play song
    function queueConsume() {
        // pop and clear the queue as the rest of the queue is not important for now
        // [filePath, should the file be played as well]
        let tupleData = sourceQueue.queue.pop();
        audioTagDOM.src = tupleData[0];
        sourceQueue.queue = [];
        // callback
        changeCallbacks.music(player.name, tupleData[0]);
        // play the song if it was requested
        if (tupleData[1]) audioTagDOM.play();
    };
    // check if queue can be consumed already and return a success (if consumed)
    function queueConsumeTimed() {
        if (sourceQueue.lastConsumed === null || (Date.now() >= sourceQueue.lastConsumed + header.player.srcConsimungInterval)) {
            queueConsume();
            sourceQueue.lastConsumed = Date.now();
            return true;
        } else return false;
    };
    // update and consume queue if needed
    function queueUpdateConsume(filePath, shouldPlay) {
        sourceQueue.queue.push([filePath, shouldPlay]);
        if (!queueConsumeTimed()) setTimeout(() => {
            if (sourceQueue.queue.length > 0)
                queueConsumeTimed();
        }, header.player.srcConsimungInterval);
    };
    // update the song with the local index and play it if specified
    function songUpdate(shouldPlay = true) {
        // check if shuffle is on and get specific index
        let indexToPlay = (playerStates.shuffle.possible[playerStates.shuffle.state] == "on") ?
            player.listShuffledIndexes[player.index]: player.index;

        // assign the needed stuff
        player.name = player.list[indexToPlay][0];
        queueUpdateConsume(player.list[indexToPlay][1], shouldPlay);
    };
    // create or remove shuffled playlists if so needed
    function shufflePlaylist(buttonClick = false) {
        if (playerStates.shuffle.possible[playerStates.shuffle.state] == "on") {
            player.listShuffledIndexes = utils.shuffle.indexToBeginning(player.list.length, player.index);
            player.index = 0;
        } else if (buttonClick && player.listShuffledIndexes.length > 0) {
            // normalize the index if changed before
            player.index = player.listShuffledIndexes[player.index];
        }
    };
    // update the player list
    function updateListPlay(namePathCoupleList, songIndex) {

        // update the local list
        player.list = namePathCoupleList;
        // update local index
        player.index = songIndex;

        if (!player.init) player.init = true;

        // check if it is needed to shuffle the indexes
        shufflePlaylist();

        // update the song with the local data
        songUpdate();

    };
    // function for changing the track with numbers
    function trackOffset(changeNumber, automaticChange = false) {

        // check if it should run
        if (!player.init) return;

        // check if it is a previous call and reset song
        // if the song has passed a certain ammount of time
        if (changeNumber < 0 && audioTagDOM.currentTime > header.player.previousResetSongTime) {
            timeSet(0);
            return;
        }

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

        songUpdate(shouldPlay);

    };

    /*
     * Volume control
     */

    function volumeUpdate() {
        audioTagDOM.volume = (volume.val / 100);
        changeCallbacks.musicVolume(volume.val, 100);
    };
    function volumeOffset(changeOffset) {
        volume.val += changeOffset;
        // check the overflows
        volume.val = utils.misc.checkOverflow(volume.val, 0, 100);

        volumeUpdate();
    };
    function volumeSet(newVolume) {
        volume.val = newVolume;
        // check the overflows
        volume.val = utils.misc.checkOverflow(volume.val, 0, 100);

        volumeUpdate();
    };
    function volumeStoreChange() {
        if (volume.val != 0) {
            volume.lastVal = volume.val;
            volume.val = 0;
        } else if (volume.lastVal != null) {
            volume.val = volume.lastVal;
            volume.lastVal = null;
        }
        volumeUpdate();
    };

    /*
     * States and flags control
     */

    function stateRotate(stateName) {
        // get the maximum number of states
        let maxStates = playerStates[stateName].possible.length;

        // rotation of states
        playerStates[stateName].state = utils.misc.containExtrapolation(playerStates[stateName].state + 1, maxStates);
    };
    function shuffle() {
        stateRotate("shuffle");
        shufflePlaylist(true);
        changeCallbacks.shuffle(playerStates.shuffle.possible[playerStates.shuffle.state]);
    };
    function repeat() {
        stateRotate("repeat");
        changeCallbacks.repeat(playerStates.repeat.possible[playerStates.repeat.state]);
    };

    /*
     * Audio HTML5 events control
     */

    function audioEnded() { trackOffset(1, true); };
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

    // bind the events
    // must be run on init
    function addAudioTagListeners() {
        audioTagDOM.onended = audioEnded;
        audioTagDOM.ontimeupdate = timeUpdate;
        // audioTagDOM.onprogress = () => {};
        audioTagDOM.onpause = playPauseEvent;
        audioTagDOM.onplay = playPauseEvent;
    };

    /****************************
     * Callbacks to the outside *
     ****************************/

    // functions that will be called when a specific local event happens
    // have to be assinged on the init
    var changeCallbacks = {
        // callback when the music source is changed
        // [song_name, song_path]
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

    /*
     * Data that will be available to the module
     */

    return {

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

        },

        // player control
        control: {
            playPause:    function()           { playPause(); },
            shuffle:      function()           { shuffle(); },
            repeat:       function()           { repeat(); },
            timeOffset:   function(offset)     { timeOffset(offset); },
            timeSet:      function(percentage) { timeSet(percentage); },
            trackOffset:  function(offset)     { trackOffset(offset); },
            volumeOffset: function(offset)     { volumeOffset(offset); },
            volumeSet:    function(percentage) { volumeSet(percentage); },
            volumeFreeze: function()           { volumeStoreChange(); }
        },

        // update the local list and play the clicked song
        updateListAndPlay: function(listCouple, itemClicked) { updateListPlay(listCouple, itemClicked); }

    };

}());
