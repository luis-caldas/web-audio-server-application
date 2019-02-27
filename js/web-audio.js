"use strict";

/***********
 * Globals *
 ***********/

var listingData = {};

// style tag for adding new rules
var varStyle;

/*****************
 * Configuration *
 *****************/

const fadeIndervals = {
    quick: 100,
    medium: 500,
    slow: 1000
};

const timeouts = {
    modal: 3,
    ajax: 10
}

// audio tag identifier
const mainAudioTag = "audio#main-audio";
const mainListTag = "div#main-lister";
const returnButtonTag = "a#return-button";
const pathShowTag = "div#path-text-input";
const loadingTag = "div#loading-block";
const audioTextTag = "div.audio-playing-text div.text-input";
const audioProgressBarParentTag = "div#audio-progress div.progress";
const audioProgressBarTag = "div#audio-progress div#audio-progress-bar";
const audioBufferProgressBarTag = "div#audio-progress div#audio-buffer-progress-bar";
const volumeProgressBarTag = "div#volume-progress input#volume-range";
const modalTag = "div#main-modal";
const modalTitleTag = "#modal-title";
const modalTextTag = "div#warning-modal";

const tagClasses = "simple-tag";

const possibleFileTypes = ["dir", "audio", "image", "misc"];

const iconFontFileTypeListRelation = ["\uf07b", "\uf001", "\uf03e", "\uf15b"];

const iconFontRelation = {
    "arrow-alt-left": "\uf060",
    "arrow-alt-right": "\uf061",
    "file-type-icons": iconFontFileTypeListRelation,
    "play": "\uf04b",
    "pause": "\uf04c",
    "volume": {
        "off": "\uf026",
        "down": "\uf027",
        "med": "\uf6a8",
        "up": "\uf028"
    },
    "repeat": {
        "normal": "\uf364",
        "one": "\uf366"
    },
    "folder-separator": "\u279c"
};

// default initial path
const initialPath = "/";

const infoStringsDefault = {
    connection: "Unable to connect to the API server on " + getHostname(myServer.address),
    data: "Wrong data received",
    default: "An error occurred"
};

/*********
 * Utils *
 *********/

function getHostname(hostInput) {
    return (!hostInput) ? window.location.hostname : hostInput;
}

const buildUrl = (serverObject, getString) => {

    // check if the given address is valid
    // if not set as the same one as this page
    let hostnameNow = getHostname(serverObject["address"]);

    return serverObject["protocol"] + "://" + hostnameNow + ":" +
           serverObject["port"] + (getString ? "/" + getString : "");
};

const buildParameters = (fullURL, parameters) => {
    return fullURL + "?" + jQuery.param(parameters);
};

const buildFullUrl = (serverObject, getString, parameters) => {
    return buildParameters(buildUrl(serverObject, getString), parameters);
};

const extractTypeList = (listItems, typeToExtract) => {
    let typeListExtracted = [];
    for (let i = 0; i < listItems.length; ++i)
        if (listItems[i][2] == typeToExtract)
            typeListExtracted.push([listItems[i][0], listItems[i][1]]);
    return typeListExtracted;
};

// callback functions for done() fail() always() respectively for the ajax requests
// each must receive json as input
const triCallback = (firstCall, secondCall, thirdCall) => {
    return [firstCall, secondCall, thirdCall];
};

/***********************
 * Errors and warnings *
 ***********************/

const defaultJSONLog = (JSONInput) => {
    console.log(JSONInput);
};

const warningFn = (warningString) => {
    console.log(warningString);
    modalPop(warningString, "Warning", 10);
};

const errorFn = (errorString) => {
    console.log(errorString);
    modalPop(errorString, "Error", 60);
};

const fatalErrorFn = (errorString) => {
    console.log(errorString);
    modalPop(errorString, "Fatal", null);
};

const nN = (inputVar) => {};

/***************
 * Modal popup *
 ***************/

function modalPop(textToShow, titleToShow = "Info", timeoutVal = timeouts.modal) {
    // change the data
    $(modalTextTag).html(textToShow);
    $(modalTitleTag).html(titleToShow);

    // show the modal
    $(modalTag).modal("show");

    // add timeout for the modal
    if (!isNaN(timeoutVal))
        setTimeout(() => {
            $(modalTag).modal("hide");
        }, timeoutVal * 1000);
};

/*****************
 * API Functions *
 *****************/

// folder retriever
function retrieveContentsFolder(folderPath) {

    $.ajax({
        method: "POST",
        url: buildUrl(myServer, "list"),
        data: { path: folderPath },
        dataType: "json",
        timeout: timeouts.ajax * 1000
    }).done(function (receivedJSON, folderToSet){

        if (receivedJSON.hasOwnProperty("files")) {

            // set the default path
            listingData["path"] = folderPath;

            // create the path stack
            if (!listingData.hasOwnProperty("pathStack"))
                listingData["pathStack"] = [];

            // fill the stack
            listingData["pathStack"].push(folderPath);

            // load into global memory the loaded data
            listingData["loaded"] = receivedJSON["files"].sort(humanTypeSensitiveSorting);

            // dump to the page
            dumpToVisualList();

        } else warningFn(infoStringsDefault.data);

    }).fail(() => {
        $(loadingTag).hide();
        fatalErrorFn(infoStringsDefault.connection);
    });

};

/****************
 * Manipulators *
 ****************/

function itemClick () {

    // extract the index from the tag
    let itemIndex = $(this).attr("unique-index");

    // get the information from the index
    let itemNow = listingData["loaded"][itemIndex];

    // dependent in which type of file use a different function
    switch (itemNow[2]) {
        case possibleFileTypes[0]:
            dirClick(itemNow);
            break;
        case possibleFileTypes[1]:
            musClick(itemNow);
            break;
        case possibleFileTypes[2]:
            imgClick(itemNow);
            break;
        case possibleFileTypes[3]:
            mscClick(itemNow);
            break;
        default:
            warningFn(infoStringsDefault.default);
    }

};

function cleanAndDir(specificPath) {
    clearVisualList();
    retrieveContentsFolder(specificPath);
};

function dirClick(itemClicked) {
    cleanAndDir(itemClicked[1]);
};

function musClick(itemClicked) {

    // extract songs
    let listPathNameCoupleAudio = extractTypeList(listingData["loaded"], possibleFileTypes[1]);

    // create the full path
    for (let i = 0; i < listPathNameCoupleAudio.length; ++i)
        listPathNameCoupleAudio[i][1] = buildFullUrl(myServer, "file", { path: listPathNameCoupleAudio[i][1] });

    webPlayer.updateListPlay(listPathNameCoupleAudio, itemClicked[0]);
};

function imgClick(itemClicked) { /* openInNewTab(buildFullUrl(myServer, "file", { path: itemClicked[1] })) */ };
function mscClick(itemClicked) { openInNewTab(buildFullUrl(myServer, "file", { path: itemClicked[1] })) };

function openInNewTab(sourcePath) {
    window.open(sourcePath, "_blank");
};

function returnButton() { returnPathListing(); };

function returnPathListing() {

    // check the stack
    // the stack should always have the root in it
    if (listingData["pathStack"].length > 1) {

        // remove the last stack item
        listingData["pathStack"].pop();

        // copy the last stack item
        let lastStackItem = listingData["pathStack"].pop();

        // reload folder
        cleanAndDir(lastStackItem);

    }

};

function updateChangeSong() {

    // update the title
    $("title").html(webPlayer.playingName);

    // update the player text
    $(audioTextTag).html(webPlayer.playingName);
    if (checkWidthOverflow(audioTextTag)) wrapInnerWithMarqueeOverflow($(audioTextTag), $(audioTextTag).width());

}

/***********
 * Sorting *
 ***********/

function strnatcmp (a, b) {

    let leadingZeros = /^0+(?=\d)/;
    let whitespace = /^\s/;
    let digit = /^\d/;

    if (arguments.length !== 2) return null;

    if (!a.length || !b.length) return a.length - b.length;

    let i = 0;
    let j = 0;

    a = a.replace(leadingZeros, "");
    b = b.replace(leadingZeros, "");

    while (i < a.length && j < b.length) {

            // skip consecutive whitespace
            while (whitespace.test(a.charAt(i))) i++;
            while (whitespace.test(b.charAt(j))) j++;

            let ac = a.charAt(i);
            let bc = b.charAt(j);
            let aIsDigit = digit.test(ac);
            let bIsDigit = digit.test(bc);

        if (aIsDigit && bIsDigit) {

            let bias = 0;
            let fractional = ac === '0' || bc === '0';

            do {

                if (!aIsDigit)
                    return -1;
                else if (!bIsDigit)
                    return 1;
                else if (ac < bc) {
                    if (!bias)
                        bias = -1;
                    if (fractional)
                        return -1;
                } else if (ac > bc) {
                    if (!bias)
                        bias = 1;
                    if (fractional)
                        return 1;
                }

                ac = a.charAt(++i);
                bc = b.charAt(++j);

                aIsDigit = digit.test(ac);
                bIsDigit = digit.test(bc);

            } while (aIsDigit || bIsDigit);

            if (!fractional && bias) return bias;

            continue;
        }

        if (!ac || !bc)
            continue;
        else if (ac < bc)
            return -1;
        else if (ac > bc)
            return 1;

        i++;
        j++;

    }

    var iBeforeStrEnd = i < a.length;
    var jBeforeStrEnd = j < b.length;

    // Check which string ended first
    // return -1 if a, 1 if b, 0 otherwise
    return (iBeforeStrEnd > jBeforeStrEnd) - (iBeforeStrEnd < jBeforeStrEnd);

}

function humanTypeSensitiveSorting(inA, inB) {

    // separating into easier vars
    let fileNameA = inA[0];
    let fileNameB = inB[0];

    let fileExtensionA = inA[2];
    let fileExtensionB = inB[2];

    if (fileNameA == fileNameB) return 0;

    // weigh the types
    let wA = possibleFileTypes.indexOf(fileExtensionA);
    let wB = possibleFileTypes.indexOf(fileExtensionB);

    // if the extensions are equal tun the alpha num sorting
    if (wA == wB) return strnatcmp(fileNameA, fileNameB);

    // sort the weights
    return wA < wB ? -1 : 1;

};

/**********
 * Visual *
 **********/

function changePathVisual(pathNow) {

    let newPath = "";

    // replace normal folder slashes for
    if (pathNow != "/") newPath = pathNow.replace(/\//g, " " + iconFontRelation["folder-separator"] + " ");
    else                newPath = "Root";

    // update the path
    $(pathShowTag).html(newPath);

    // check overflow
    if (checkWidthOverflow(pathShowTag)) wrapInnerWithMarqueeOverflow($(pathShowTag), $(pathShowTag).width());

}

function buildSingleLinkToDOM(typeOfLink, linkName, linkIndex, linkPath, linkOnClickFunction, whereToAppendDOM) {

    // create a new 'a' tag
    let newA = $("<a></a>");

    // create the parent div
    let parentLink = $("<div></div>");
    parentLink.addClass("parent-inside");

    // icon part inside the link
    let iconLinkParent = $("<div></div>");
    iconLinkParent.addClass("parent-icon-link-inside");
    let iconLink = $("<div></div>");
    iconLink.addClass("icon-link-inside");
    iconLink.addClass("icon-font");

    // load the right icon for the file type
    iconLink.html(iconFontFileTypeListRelation[
        possibleFileTypes.indexOf(typeOfLink)
    ]);

    // text part inside the link
    let textLinkParent = $("<div></div>");
    textLinkParent.addClass("parent-text-link-inside");
    let textLink = $("<div></div>");
    textLink.addClass("text-link-inside");

    // populate the tag with the new informations
    textLink.text(linkName);

    // add its own index
    newA.attr("unique-index", linkIndex);

    // add unique type class
    newA.addClass("btn");
    newA.addClass("btn-mine");
    newA.addClass("btn-responsive-m");

    // add onclick function
    newA.click(linkOnClickFunction);

    // append the icon and text to the parent
    iconLinkParent.append(iconLink);
    textLinkParent.append(textLink);
    parentLink.append(iconLinkParent);
    parentLink.append(textLinkParent);

    // check if is a picture and add lightbox stuff in it
    if (typeOfLink == possibleFileTypes[2])
        newA.attr("href", buildFullUrl(myServer, "file", { path: linkPath }))
            .attr("data-lightbox", "covers");

    // append the parent to the link
    newA.append(parentLink);

    // append to the page
    $(whereToAppendDOM).append(newA);

    // check if overflow and add the marque divs
    if (checkWidthOverflow(textLinkParent)) wrapInnerWithMarquee(textLink, $(textLinkParent).width());

};

function dumpToVisualList() {

    // iterate the items in the playlist
    if (!listingData.hasOwnProperty("loaded")) {
        warningFn(infoStringsDefault.default);
        return;
    }

    // iterate the items
    for (let i = 0; i < listingData["loaded"].length; ++i) {

        buildSingleLinkToDOM(
            listingData["loaded"][i][2],
            listingData["loaded"][i][0],
            i,
            listingData["loaded"][i][1],
            itemClick,
            mainListTag
        );

    }

    // replace normal folder slashes for
    changePathVisual(listingData["path"]);

    // some eye candy
    $(loadingTag).hide();
    $(pathShowTag).fadeIn(fadeIndervals.quick);
    $(mainListTag).hide();
    $(mainListTag).fadeIn(fadeIndervals.quick);

}

function checkWidthOverflow(domItem) {
    return $(domItem).prop("scrollWidth") > $(domItem).prop("offsetWidth");
}

function wrapInnerWithMarquee(domItem, limitedSize) {
    // create marquee div
    let marqueeDiv = $("<div></div>");
    marqueeDiv.addClass("mine-marquee");

    // wrap the dom in the marquee
    $(domItem).wrapInner(marqueeDiv);

    // new marquee reference
    let marqueeReference = domItem.find("div.mine-marquee");

    // chage its size for the animation to work
    marqueeReference.width(marqueeReference.width() - limitedSize);
}

function wrapInnerWithMarqueeOverflow(domItem, limitedSize) {
    // create marquee div
    let marqueeDiv = $("<div></div>");
    marqueeDiv.addClass("mine-marquee");

    // wrap the dom
    $(domItem).wrapInner(marqueeDiv);

    // new marquee reference
    let marqueeReference = domItem.find("div.mine-marquee");

    // chage its size for the animation to work
    marqueeReference.width(marqueeReference.width() - limitedSize);

    // wrap the dom with the overflow protection
    $(domItem).wrapInner($("<div></div>").addClass("mine-marquee-overflow"));
}

function clearVisualList() {

    // path shower
    $(pathShowTag).html("&nbsp;");

    // files list
    $(mainListTag).empty();

    // show the loading block
    $(loadingTag).fadeIn(fadeIndervals.quick);

}

/**********************
 * Audio icon changes *
 **********************/

function playPauseButtonUpdate() {
    if (webPlayer.audioTagDOM.paused) $("#playpause").html(iconFontRelation["play"]);
    else $("#playpause").html(iconFontRelation["pause"]);
}

function updateButton(buttonName) {
    switch (buttonName) {
        case "playpause":
            playPauseButtonUpdate();
            break;
        default:
    }
};

function updateVolumeIcon(currentTime, totalTime) {

    // get the percentage
    let volumePercentage = currentTime / totalTime * 100;

    // set the icons depending on the percentage
    if (volumePercentage == 0) $("#volume").html(iconFontRelation["volume"]["off"]);
    else if (volumePercentage < 33) $("#volume").html(iconFontRelation["volume"]["down"]);
    else if (volumePercentage < 66) $("#volume").html(iconFontRelation["volume"]["med"]);
    else $("#volume").html(iconFontRelation["volume"]["up"]);

};

function shuffleButtonUpdate(shuffleValue) {
    // get the repeat value and set visual accordingly
    switch (shuffleValue) {
        case "off":
            $("#shuffle").addClass("inactive");
            break;
        case "on":
            $("#shuffle").removeClass("inactive");
            break;
        default:
    }
};

function repeatButtonUpdate(repeatValue) {
    // get the repeat value and set visual accordingly
    switch (repeatValue) {
        case "off":
            $("#repeat").html(iconFontRelation["repeat"]["normal"]);
            $("#repeat").addClass("inactive");
            break;
        case "repeatAll":
            $("#repeat").html(iconFontRelation["repeat"]["normal"]);
            $("#repeat").removeClass("inactive");
            break;
        case "repeatOne":
            $("#repeat").html(iconFontRelation["repeat"]["one"]);
            $("#repeat").removeClass("inactive");
            break;
        default:
    }
};

/*****************
 * Progress bars *
 *****************/

function musicProgressBarUpdate(currentTime, totalTime, bufferEnd) {

    // calculate percentages
    let timePercentage = currentTime / totalTime * 100;
    let bufferPercentage =  bufferEnd / totalTime * 100;

    // get the real buffer percentage
    let realBufferPercentage = bufferPercentage - timePercentage;
    if (realBufferPercentage < 0) realBufferPercentage = 0;

    $(audioProgressBarTag).width(timePercentage + "%");
    $(audioBufferProgressBarTag).width(realBufferPercentage + "%");
};

function clickedProgressBar(event) {
    // get the click location
    let horizontalClickPosition = event.pageX - $(this).offset().left;
    let clickedPercentage = horizontalClickPosition / $(this).width() * 100;

    // set the volume and update
    webPlayer.changePercentTime(clickedPercentage);
};

/****************
 * Range Inputs *
 ****************/

const rangeDefaultData = {
    min:  0,
    max:  10000,
    init: 10000
};

function initializeRange(rangeTag) {
    $(rangeTag).attr("min", rangeDefaultData.min);
    $(rangeTag).attr("max", rangeDefaultData.max);
    $(rangeTag).val(rangeDefaultData.init);

    // simulate a click on initialization
    volumeBarClicked();
};

function translateRangeToPercentage(rangeValue) {
    return 100 / rangeDefaultData.max * rangeValue;
};

function translatePercentageToRange(percentageValue) {
    return rangeDefaultData.max / 100 * percentageValue;
};

function updateVolumeBackgroundColor(rangeTag, percentageValue, colorBefore, colorAfter) {
    $(varStyle).text(`
        #volume-range::-webkit-slider-runnable-track {
            background-image: -webkit-gradient(
                linear,
                left top,
                right top,
                color-stop(` + percentageValue + "% , " + colorBefore + `),
                color-stop(` + percentageValue + "% , " + colorAfter + `)
            );
        }
    `);
};

function musicVolumeUpdate(currentTime, totalTime) {

    // get the value
    let valueNowPercentage = currentTime / totalTime * 100;
    let valueNow = translatePercentageToRange(valueNowPercentage);

    // set the new value
    $(volumeProgressBarTag).val(valueNow);

    // update the icon
    updateVolumeIcon(currentTime, totalTime);

    // update the background color of the input range
    updateVolumeBackgroundColor(
        volumeProgressBarTag,
        valueNowPercentage,
        $(volumeProgressBarTag).css("--color-before"),
        $(volumeProgressBarTag).css("--color-after")
    );
};

function volumeBarClicked() {

    // get the current value of the input
    let valueNowPercentage = translateRangeToPercentage($(volumeProgressBarTag).val());

    // set the volume and update
    webPlayer.setExactVolume(valueNowPercentage);
    webPlayer.updateVolume();

};

/***************
 * Key presses *
 ***************/

const keyRelation = {
    codeKeyRelation: {
        r: 82
    },
    keyFunctionRelation: {
        return: "r"
    }
};

function getKeyCode(functionName) {
    return keyRelation.codeKeyRelation[keyRelation.keyFunctionRelation[functionName]];
};

function onKeyPress(keypressEvent) {
    switch (keypressEvent.which) {
        case getKeyCode("return"):
            returnButton();
            break;
        default:
    }
};

/************************
 * First time execution *
 ************************/

window.onpopstate = () => {
    returnPathListing();
    history.pushState({}, "");
};

function assignAudioPlayerButtonsToObject() {

    let buttonFunctionRelation = {
        playpause: webPlayer.buttonPressPlayPause,
        previous: webPlayer.buttonPressPrevious,
        next: webPlayer.buttonPressNext,
        shuffle: webPlayer.buttonPressShuffle,
        repeat: webPlayer.buttonPressRepeat,
        volume: webPlayer.buttonPressVolume
    };

    // split the relation keys
    let functionAudioKeys = Object.keys(buttonFunctionRelation);

    // iterate and add the on click events
    for (let i = 0; i < functionAudioKeys.length; ++i)
        // find the button through is similar entry ID
        $("#" + functionAudioKeys[i]).click(buttonFunctionRelation[functionAudioKeys[i]]);

};

$(document).ready(function(){

    // first buffer state for the back button
    history.pushState({}, "");

    // style tag to be dynamically changed for
    // css rules that cant be accessed through dom
    varStyle = $("<style>", { type: "text/css" }).appendTo("head");

    // retrieve the contents folder
    retrieveContentsFolder(initialPath);

    // attach function to return button
    $(returnButtonTag).click(returnButton);

    // attach the audio tag to the webplayer
    webPlayer.audioTagDOM = $(mainAudioTag)[0];  // must be the real dom

    // add the on music change local function callbacks
    webPlayer.musicChangedCallback = updateChangeSong;
    webPlayer.addAudioTagListeners();

    // add local icon change callback
    webPlayer.iconChangeCallback = updateButton;

    // add music progress bar on change callback
    webPlayer.musicProgressChangeCallback = musicProgressBarUpdate;
    webPlayer.musicVolumeChangeCallback = musicVolumeUpdate;

    // add the shuffle and repeat buttons callback
    webPlayer.shuffleChangeCallback = shuffleButtonUpdate;
    webPlayer.repeatChangeCallback = repeatButtonUpdate;

    // add onclick events for the progress bar
    $(audioProgressBarParentTag).click(clickedProgressBar);

    // add click events for the dragable volume bar
    initializeRange(volumeProgressBarTag);
    $(volumeProgressBarTag).on("input", volumeBarClicked);

    // attach the keypress callback to the webplayer
    $(document).keydown((event) => {
        onKeyPress(event);
        webPlayer.keyPressFunction(event);
    });

    // map all the audio buttons to the object functions
    assignAudioPlayerButtonsToObject();

});
