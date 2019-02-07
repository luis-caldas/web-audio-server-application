"use strict";

/***********
 * Globals *
 ***********/

var listingData = {};

/*****************
 * Configuration *
 *****************/

const fadeIndervals = {
    quick: 100,
    medium: 500,
    slow: 1000
};

// audio tag identifier
const mainAudioTag = "audio#main-audio";
const mainListTag = "div#main-lister";
const returnButtonTag = "a#return-button";
const pathShowTag = "div#path-text-input";
const loadingTag = "div#loading-block";
const audioTextTag = "div.audio-playing-text div.text-input";
const audioProgressBarTag = "div#audio-progress-bar";
const volumeProgressBarTag = "div#volume-progress-bar"

const tagClasses = "simple-tag";

const possibleFileTypes = ["dir", "audio", "image", "misc"];

const iconFontFileTypeListRelation = ["\uf07b", "\uf001", "\uf03e", "\uf15b"];

const iconFontRelation = {
    "arrow-alt-left": "\uf060",
    "arrow-alt-right": "\uf061",
    "file-type-icons": iconFontFileTypeListRelation,
    "play": "\uf04b",
    "pause": "\uf04c"
};

// default initial path
const initialPath = "/";

const stringsDefault = {
    connection: "Unable to connect to the server",
    data: "Wrong data received",
    default: "An error occurred"
};

/*********
 * Utils *
 *********/

const buildUrl = (serverObject, getString) => {
    return serverObject["protocol"] + "://" + serverObject["address"] + ":" +
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
    alert(warningString);
};

const nN = (inputVar) => {};

/*****************
 * API Functions *
 *****************/

// folder retriever
function retrieveContentsFolder(folderPath) {

    $.ajax({
        method: "POST",
        url: buildUrl(myServer, "list"),
        data: { path: folderPath },
        dataType: "json"
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

        } else warningFn(stringsDefault.data);

    }).fail(defaultJSONLog);

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
            warningFn(stringsDefault.default);
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

function sortAlphaNum(inA, inB) {

    let sortingReAlpha = /[^a-zA-Z]/g;
    let sortingReNum = /[^0-9]/g;

    // parse the item to int
    let intA = parseInt(inA, 10);
    let intB = parseInt(inB, 10);

    if (isNaN(intA) && isNaN(intB)) {

        let alphaA = inA.replace(sortingReAlpha, "");
        let alphaB = inB.replace(sortingReAlpha, "");

        if (alphaA === alphaB) {
            let numA = parseInt(inA.replace(sortingReNum, ""), 10);
            let numB = parseInt(inB.replace(sortingReNum, ""), 10);
            return numA === numB ? 0 : numA > numB ? 1 : -1;
        } else
            return alphaA > alphaB ? 1 : -1;
    } else
        if(isNaN(intA)) return 1;
    else
        if(isNaN(intB)) return -1;
    else
        return intA > intB ? 1 : -1;

};

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
    if (wA == wB) return sortAlphaNum(fileNameA, fileNameB);

    // sort the weights
    return wA < wB ? -1 : 1;

};

/**********
 * Visual *
 **********/

function changePathVisual(pathNow) {

    let newPath = "";

    // replace normal folder slashes for
    if (pathNow != "/") newPath = pathNow.replace(/\//g, " \u279C ");
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
        warningFn(stringsDefault.default);
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

/*****************
 * Progress bars *
 *****************/

function musicProgressBarUpdate(currentTime, totalTime) {
    $(audioProgressBarTag).width((currentTime / totalTime * 100) + "%");
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
        shuffle: () => {},
        repeat: () => {},
        volume: () => {}
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

    // retrieve the contents folder
    retrieveContentsFolder(initialPath);

    // attach function to return button
    $(returnButtonTag).click(returnButton);

    // hide the loading
    $(loadingTag).hide();

    // attach the audio tag to the webplayer
    webPlayer.audioTagDOM = $(mainAudioTag)[0];  // must be the real dom

    // add the on music change local function callbacks
    webPlayer.musicChangedCallback = updateChangeSong;
    webPlayer.addAudioTagListeners();

    // add local icon change callback
    webPlayer.iconChangeCallback = updateButton;

    // add music progress bar on change callback
    webPlayer.musicProgressChangeCallback = musicProgressBarUpdate;

    // attach the keypress callback to the webplayer
    $(document).keydown(webPlayer.keyPressFunction);

    // map all the audio buttons to the object functions
    assignAudioPlayerButtonsToObject();

});
