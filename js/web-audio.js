"use strict";

/***********
 * Globals *
 ***********/

var playlistData = {};

/*****************
 * Configuration *
 *****************/

// server connection settings
const myServer = {
    address: "192.168.43.175",
    port: 30086,
    protocol: "http"
};

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

const tagClasses = "simple-tag";

const firstTitle = "Web Audio";

const possibleFileTypes = ["dir", "audio", "image", "misc"];

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
}

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
            playlistData["path"] = folderPath;

            // create the path stack
            if (!playlistData.hasOwnProperty("pathStack"))
                playlistData["pathStack"] = [];

            // fill the stack
            playlistData["pathStack"].push(folderPath);

            // load into global memory the loaded data
            playlistData["loaded"] = receivedJSON["files"].sort(humanTypeSensitiveSorting);

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
    let itemNow = playlistData["loaded"][itemIndex];

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
    $(mainAudioTag).attr("src", buildFullUrl(myServer, "file", { path: itemClicked[1] }));
    $(mainAudioTag)[0].play();
};

function imgClick(itemClicked) { openInNewTab(buildFullUrl(myServer, "file", { path: itemClicked[1] })) };
function mscClick(itemClicked) { openInNewTab(buildFullUrl(myServer, "file", { path: itemClicked[1] })) };

function openInNewTab(sourcePath) {
    window.open(sourcePath, "_blank");
};

function returnButton() { returnPathListing(); };

function returnPathListing() {

    // check the stack
    // the stack should always have the root in it
    if (playlistData["pathStack"].length > 1) {

        // remove the last stack item
        playlistData["pathStack"].pop();

        // copy the last stack item
        let lastStackItem = playlistData["pathStack"].pop();

        // reload folder
        cleanAndDir(lastStackItem);

    }

};

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

function dumpToVisualList() {

    // iterate the items in the playlist
    if (!playlistData.hasOwnProperty("loaded")) {
        warningFn(stringsDefault.default);
        return;
    }

    // iterate the items
    for (let i = 0; i < playlistData["loaded"].length; ++i) {

        // create a new 'a' tag
        let newA = $("<a></a>");

        // populate the tag with the new informations
        newA.text(playlistData["loaded"][i][0]);

        // add its own index
        newA.attr("unique-index", i);

        // add unique type class
        newA.addClass("btn");
        newA.addClass("btn-mine");
        newA.addClass("btn-responsive-m");

        // add onclick function
        newA.click(itemClick);

        // append to the page
        $(mainListTag).append(newA);

        if (checkWidthOverflow(newA)) wrapInnerWithMarquee(newA);

    }

    // update the path
    $(pathShowTag).html(playlistData["path"]);

    // check overflow
    if (checkWidthOverflow(pathShowTag)) wrapInnerWithMarquee(pathShowTag);

    // fade in the whole thing
    $(pathShowTag).fadeIn(fadeIndervals.quick);
    $(mainListTag).hide();
    $(mainListTag).fadeIn(fadeIndervals.quick);

}

function checkWidthOverflow(domItem) {
    return $(domItem).prop("scrollWidth") > $(domItem).prop("offsetWidth");
}

function wrapInnerWithMarquee(domItem) {
    $(domItem).wrapInner($("<div></div>").addClass("mine-marquee"))
              .wrapInner($("<div></div>").addClass("mine-marquee-overflow"));
}

function clearVisualList() {

    // path shower
    $(pathShowTag).html("&nbsp;");

    // files list
    $(mainListTag).empty();

}

/************************
 * First time execution *
 ************************/

window.onpopstate = () => {
    returnPathListing();
    history.pushState({}, "");
};

$(document).ready(function(){

    // first buffer state for the back button
    history.pushState({}, "");

    $("title").html(firstTitle);

    // retrieve the contents folder
    retrieveContentsFolder(initialPath);

    // attach function to return button
    $(returnButtonTag).click(returnButton);

});
