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
const loadingTag = "div#loading-block";

const tagClasses = "simple-tag";

const possibleFileTypes = ["dir", "audio", "image", "misc"];

const iconFontFileTypeListRelation = ["\uf07b", "\uf001", "\uf03e", "\uf15b"];

const iconFontRelation = {
    "arrow-alt-left": "\uf060",
    "arrow-alt-right": "\uf061",
    "file-type-icons": iconFontFileTypeListRelation
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
    $("title").html(itemClicked[0]);
    $(mainAudioTag).attr("src", buildFullUrl(myServer, "file", { path: itemClicked[1] }));
    $(mainAudioTag)[0].play();
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
            possibleFileTypes.indexOf(playlistData["loaded"][i][2])
        ]);

        // text part inside the link
        let textLinkParent = $("<div></div>");
        textLinkParent.addClass("parent-text-link-inside");
        let textLink = $("<div></div>");
        textLink.addClass("text-link-inside");

        // populate the tag with the new informations
        textLink.text(playlistData["loaded"][i][0]);

        // add its own index
        newA.attr("unique-index", i);

        // add unique type class
        newA.addClass("btn");
        newA.addClass("btn-mine");
        newA.addClass("btn-responsive-m");

        // add onclick function
        newA.click(itemClick);

        // append the icon and text to the parent
        iconLinkParent.append(iconLink);
        textLinkParent.append(textLink);
        parentLink.append(iconLinkParent);
        parentLink.append(textLinkParent);

        // check if is a picture and add lightbox stuff in it
        if (playlistData["loaded"][i][2] === possibleFileTypes[2])
            newA.attr("href", buildFullUrl(myServer, "file", { path: playlistData["loaded"][i][1] }))
                .attr("data-lightbox", "covers");

        // append the parent to the link
        newA.append(parentLink);

        // append to the page
        $(mainListTag).append(newA);

        if (checkWidthOverflow(textLinkParent)) wrapInnerWithMarquee(textLink, $(textLinkParent).width());

    }

    // replace normal folder slashes for
    if (playlistData["path"] != "/") {
        playlistData["path"] = playlistData["path"].replace(/\//g, " \u279C ");
    } else {
        playlistData["path"] = "Root";
    }

    // update the path
    $(pathShowTag).html(playlistData["path"]);

    // check overflow
    if (checkWidthOverflow(pathShowTag)) wrapInnerWithMarqueeOverflow($(pathShowTag), $(pathShowTag).width());

    // fade in the whole thing
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

    // retrieve the contents folder
    retrieveContentsFolder(initialPath);

    // attach function to return button
    $(returnButtonTag).click(returnButton);

    // hide the loading
    $(loadingTag).hide();

});
