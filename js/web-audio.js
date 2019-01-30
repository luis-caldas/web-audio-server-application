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

const tagClasses = "simple-tag";

// default initial path
const initialPath = "/";

const CSSIdentifyPrefix = "style-diff-item";

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

            console.log(playlistData["pathStack"]);

            // load into global memory the loaded data
            playlistData["loaded"] = receivedJSON["files"];

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
        case "dir":
            dirClick(itemNow);
            break;
        case "audio":
            musClick(itemNow);
            break;
        case "image":
            imgClick(itemNow);
            break;
        case "misc":
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

function returnButton() {

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
        newA.addClass(CSSIdentifyPrefix + "-" + playlistData["loaded"][i][2])
        newA.addClass("list-group-item");
        newA.addClass("list-group-item-action");
        newA.addClass("list-group-item-dark");

        // add onclick function
        newA.click(itemClick);

        // add to the bootstrap class
        let bootstrapParagraph = $("<p></p>").append(newA);

        // append to the page
        $(mainListTag).append(bootstrapParagraph);
        $(mainListTag).fadeIn(fadeIndervals.quick);

    }

}

function clearVisualList() {
    $(mainListTag).hide();
    $(mainListTag).empty();
}

/************************
 * First time execution *
 ************************/

$(document).ready(function(){

    // retrieve the contents folder
    retrieveContentsFolder(initialPath);

    // attach function to return button
    $(returnButtonTag).click(returnButton);

});
