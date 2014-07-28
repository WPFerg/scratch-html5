'use strict';


// Method to check if landscape
function IsLandscape()
{
    // Set default result
    var result = true;

    // Get screen height and width
    var width = $('html').width();
    var height = $('html').height();

    // // Make sure not buggy version of android
    // if (uagent == "android 10")
    // {
    //     height = screen.width;
    //     width = screen.height;
    // }

    // Return checked result
    return (width / height > 4/3);
};


// Method for screen scale calculations
function Scalar()
{

	// Intialize calculation variables
	var width = $('html').width();
	var height = $('html').height();
	var playerWidth = 640;
	var playerHeight = 480 + 38;
	var aspectRatio = 4/3;

	// Make sure the width/height ratios are acceptable
	if (width / height > aspectRatio)
	{
		playerHeight = height;
		playerWidth = playerHeight * aspectRatio;
	} else {
		playerWidth = width;
		playerHeight = playerWidth / aspectRatio;
	}

	// Calculate results with fallback
	var result = (playerWidth-1) / 480;

	// Return calculation
	return result;
}


// Calculate positions of objects which are relative to the landscape
function AdjustForOrientation()
{

	// Set transforms for new size
	$('#player-container').css('-webkit-transform-origin', '0 0');
	$('#player-container').css('-webkit-transform', 'scale(' + (Scalar()).toString() + ')');
	$('#trigger-green-flag').css('-webkit-transform-origin', '0 0');
	$('#trigger-green-flag').css('-webkit-transform', 'scale(' + (Scalar()).toString() + ')');
	$('#trigger-stop').css('-webkit-transform-origin', '0 0');
	$('#trigger-stop').css('-webkit-transform', 'scale(' + (Scalar()).toString() + ')');

	// Set positions for new size
	$('#player-container').css('left', (($('html').width() - $('#player-container').width() * Scalar()) / 2).toString() + 'px');
	$('#player-container').css('top', (($('html').height() - $('#player-container').height() * Scalar()) / 2).toString() + 'px');

    // Debugging canvas code
    // var displayCanvas = document.createElement('canvas');
    // displayCanvas.width = 480;
    // displayCanvas.height = 360;
    // var displayTester = displayCanvas.getContext('2d');
    // //displayTester.globalCompositeOperation = 'source-over';
    // a.stamp(displayTester, 100);
    // //displayTester.globalCompositeOperation = 'source-in';
    // b.stamp(displayTester, 100);
    // $('#hit-canvas').html(displayCanvas);
    
    // Debugging canvas
    $('#hit-canvas').css('-webkit-transform-origin', '0 0');
    $('#hit-canvas').css('-webkit-transform', 'scale(' + (Scalar()).toString() + ')');
    $('#hit-canvas').css('left', (($('html').width() - $('#player-container').width() * Scalar()) / 2).toString() + 'px');
    $('#hit-canvas').css('top', (($('html').height() - $('#player-container').height() * Scalar()) / 2).toString() + 'px');

    // Declare variables
    var GButton = $('#trigger-green-flag');
    var SButton = $('#trigger-stop');

    var GCalcLeft = 0;
    var SCalcLeft = 0;
    var GCalcTop = 0;
    var SCalcTop = 0;

    // Size buttons appropriately
    GButton.width($('#player-container').width() / 9);

    // Calculate position of buttons on screen 
    if (window.IsLandscape())
    {

        // Set default positions
        GCalcLeft = $('html').width() - GButton.width() * Scalar() - 10;
        SCalcLeft = $('html').width() - GButton.width() * Scalar() - 10;
        GCalcTop = 10;
        SCalcTop = GCalcTop + GButton.width() * Scalar() + 10;

        // Create temp hold for suggested value
        var ProposedLeft = $('html').width() - parseInt($("#player-container").css('left')) + 10;

        // Determine if there is enough space to apply suggestion
        if (ProposedLeft + GButton.width() * Scalar() < window.innerWidth)
        {
            GCalcLeft = ProposedLeft;
            SCalcLeft = ProposedLeft;
        }
        
    } else {

        // Set default positions
        SCalcLeft = $('html').width() - GButton.width() * Scalar() - 10;
        GCalcLeft = SCalcLeft - GButton.width() * Scalar() - 10;
        GCalcTop = 10;
        SCalcTop = GCalcTop;

        // Create temp hold for suggested value
        var ProposedTop = parseInt($('#player-container').css('top')) - GButton.width() * Scalar() - 10;

        // Set top values to just above player
        if (ProposedTop > 0)
        {
            GCalcTop = ProposedTop;
            SCalcTop = ProposedTop;
        }

    }

    // Sync up button dimensions
    GButton.height(GButton.width());
    SButton.width(GButton.width());
    SButton.height(GButton.width());

    // Apply positions to elements
    GButton.css('left', GCalcLeft.toString() + 'px');
    GButton.css('top', GCalcTop.toString() + 'px');
    SButton.css('left', SCalcLeft.toString() + 'px');
    SButton.css('top', SCalcTop.toString() + 'px');

}

// Return the value of a requested key
var KeyValue = function(Key)
{

    // Find key and return value
    for (var count = 0; count < window.Params.length; count ++)
    {
        if (window.Params[count].Key == Key)
        {
            return window.Params[count].Value;
        }
    }

    // Return default value
    return 'false';
}

// Get params
var PassedParams = window.location.hash.substring(1, window.location.hash.length);
var UnformattedParams = PassedParams.split('&');
window.Params = [];

// Format each parameter
for (var count = 0; count < UnformattedParams.length; count ++)
{
    // Format the parameter
    var NewParam = {};
    NewParam.Key = UnformattedParams[count].split('=')[0];
    NewParam.Value = UnformattedParams[count].split('=')[1];

    // Push to window params
    window.Params.push(NewParam);
}

// Hide element if required
if (KeyValue('showflags') == 'false')
{
    $('#trigger-green-flag').css('display', 'none');
    $('#trigger-stop').css('display', 'none');
}

// Automatically start the app
if (KeyValue('autostart') == 'true')
{
	$('#overlay').css('display', 'none');
	// if (!runtime.projectLoaded) { runtime.greenFlag(); }
}

if(KeyValue("fullscreen") !== "false")
{
    // https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Using_full_screen_mode
    $('#trigger-green-flag, #overlay').click(function() {
        toggleFullScreen();
    });
}

// Call event onload
AdjustForOrientation();

// Create orientation event variables
//var supportsOrientationChange = "onorientationchange" in window;
//var orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";

// Add event and link to event method
window.addEventListener("resize", AdjustForOrientation, false);

// Stop iOS Scrolling
$("#preloader").bind("touchstart", function(e) { e.preventDefault(); });
$("#preloader").bind("touchend", function(e) { e.preventDefault(); });

// Set project details from the API to set the title to the title of the project. If the project hasn't been published, fail silently.
$.get("http://scratch.mit.edu/api/v1/project/" + projectId + "/?format=json", function(projectData) {
    $("title").text(projectData.title);
}).fail(function(){});

function toggleFullScreen() {
  if (!document.fullscreenElement &&    // alternative standard method
      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}