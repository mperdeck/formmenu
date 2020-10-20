// "DOMContentLoaded" fires when the html has loaded, even if the stylesheets, javascript, etc are still being loaded.
// "load" fires when the entire page has loaded, including stylesheets, etc.

document.addEventListener("DOMContentLoaded", function(){
    console.log('page has loaded')
});

