"use strict";

const header = {
    // audio player
    player: {
        // minimum time passed for reseting song instead of going to previous
        previousResetSongTime: 25,  // in seconds

        // iterval for consuming the change source queue
        srcConsimungInterval: 250,  // miliseconds

        // starting volume of player
        startingVolume: 100.0,

        // starting states of player
        startingStates: {
            repeat: 1,
            shuffle: 0
        }
    }
};
