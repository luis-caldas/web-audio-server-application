"use strict";

const utils = (function(){

    // miscelaneous utilities
    const misc = {

        extractIndexFromBidimensionalArray: function(bidimensionalArray, index) {
            let tempArray = [];
            for (let i = 0; i < bidimensionalArray.length; ++i)
                tempArray.push(bidimensionalArray[i][index]);
            return tempArray;
        },

        // contains number extrapolations within a maximum range
        containExtrapolation: function(index, maximum) {
            if (index >= maximum) return index - maximum;
            else if (index < 0) return maximum + index;
            else return index;
        },

        // check overflow and contain it
        checkOverflow: function(number, minimum, maximum) {
            if (number > maximum) return maximum;
            else if (number < minimum) return minimum;
            else return number;
        },

        // points all non assinged function vars to this point
        // for debugging purposes
        empty: function() {}

    }

    // shuffling arrays and indexes
    const shuffle = {

        normal: function(array) {

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
        },

        indexToBeginning: function(totalArrayLength, indexToMaintain) {

            // create array of indexes
            let artificialIndexes = [];
            for (let i = 0; i < totalArrayLength; ++i) artificialIndexes.push(i);

            // scramble the artificial indexes
            let shuffledArray = this.normal(artificialIndexes);

            // find previous index
            let previousIndexLocation = shuffledArray.indexOf(indexToMaintain);

            // remove it
            shuffledArray.splice(previousIndexLocation, 1);

            // add it to the beginning
            shuffledArray.unshift(indexToMaintain);

            return shuffledArray;
        }
    }

    // time functions, such as async hacks
    const time = {
        sleep: function(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    }

    // return the functions in a unified object
    return {
        misc: misc,
        shuffle: shuffle,
        time: time
    };

}());
