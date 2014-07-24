
// Check to see if the project id exists
if(projectId === "")
{
    alert("No project ID.");
} else {
    
    // If so, set the HTML manifest to the manifest file.
    var appCache = window.applicationCache;
    
    // Bind events for the app cache status updates. 
    appCache.onprogress = function(e) {
        $("#preloader-caption").text("Downloading: " + e.loaded + "/" + e.total);
        $("#preloader-progress-bar").width(e.loaded * 100 / e.total + "%");
    };

    appCache.ondownloading = function(e) {
        $("#preloader-caption").text("Downloading...");
    };

    appCache.oncached = function(e) {
        $("#preloader-caption").text("Downloaded!");
        $("#preloader").fadeOut();
        showInfoMessage();
    };

    appCache.onnoupdate = function(e) {
        $("#preloader").fadeOut();
        // Do nothing.
    };

    appCache.onupdateready = function(e) {
        console.log("Updating AppCache");
        appCache.swapCache();
        appCache.oncached(e);
        $("#preloader").fadeOut();
    };

    appCache.onchecking = function(e) {
        $("#preloader-caption").text("Checking for updates...");
    };

    appCache.onerror = function(e) {
        showInfoMessage("Error checking or downloading updates.");
        $("#preloader").fadeOut();
    };

    appCache.onobsolete = function(e) {
        // Nothing
    };
}

showInfoMessage = function(text) {
    // Check if text exists, and replace if necessary.
    if(text !== "" || typeof(text) !== "undefined")
    {
        $(".install-message").text(text);
    }
    $(".install-message").fadeIn();

    setTimeout(function() { $(".install-message").fadeOut(); }, 10000);
};