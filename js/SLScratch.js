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

    // return 1;

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


// Catch any sprites created which are used by the html code
function HijackScratchSprite(Sprite, IMGElement)
{

    // Create JQuery accessor
    var JQuerySprite = null;

    // Determine if current sprite is dpad
    if (Sprite.objName == 'dpad_slscratch')
    {

        // Link jquery accessor
        JQuerySprite = $(IMGElement);
        JQuerySprite.attr('id', 'dpad-control');

        // Create original scratch X and Y variables
        if (typeof(JQuerySprite.originalScratchX) == 'undefined') { JQuerySprite.originalScratchX = JQuerySprite.scratchX; }
        if (typeof(JQuerySprite.originalScratchY) == 'undefined') { JQuerySprite.originalScratchY = JQuerySprite.scratchY; }

        // Generate altered scratch coordinates after saving originals
        Sprite.scratchOrigX = Sprite.scratchX;
        Sprite.scratchOrigY = Sprite.scratchY;
        Sprite.scratchX = Sprite.scratchOrigX - parseInt($('#player-container').css('left')) / Scalar();
        Sprite.scratchY = Sprite.scratchOrigY - parseInt($('#player-container').css('top')) / Scalar();

        // Set one time style settigns
        JQuerySprite.css('z-index', '10001');

        // Add element to page
        $('#player-container').append(IMGElement);

        // Position sprite and return object to save changes
        Sprite.updateTransform();
        return Sprite;

    }

    if (Sprite.objName == 'aButton_slscratch' || Sprite.objName == 'bButton_slscratch')
    {

        // Link jquery accessor
        JQuerySprite = $(IMGElement);
        if (Sprite.objName == 'aButton_slscratch') { JQuerySprite.attr('id', 'a-button-control'); }
        if (Sprite.objName == 'bButton_slscratch') { JQuerySprite.attr('id', 'b-button-control'); }

        // Create original scratch X and Y variables
        if (typeof(JQuerySprite.originalScratchX) == 'undefined') { JQuerySprite.originalScratchX = JQuerySprite.scratchX; }
        if (typeof(JQuerySprite.originalScratchY) == 'undefined') { JQuerySprite.originalScratchY = JQuerySprite.scratchY; }

        // Generate altered scratch coordinates after saving originals
        Sprite.scratchOrigX = Sprite.scratchX;
        Sprite.scratchOrigY = Sprite.scratchY;
        Sprite.scratchX = Sprite.scratchOrigX + parseInt($('#player-container').css('left')) / Scalar();
        Sprite.scratchY = Sprite.scratchOrigY - parseInt($('#player-container').css('top')) / Scalar();

        // Set one time style settigns
        JQuerySprite.css('z-index', '10001');

        // Add element to page
        $('#player-container').append(IMGElement);

        // Position sprite and return object to save changes
        Sprite.updateTransform();
        return Sprite;

    }

    RepositionControllers();

    // Return hijack result
    return null;

}

// Calculate controller positions and scales
function RepositionControllers()
{

    return;

    // Terminate if runtime is not made yet
    if (typeof(runtime) == 'undefined') { return; }

    // List of ID's to listen for
    var TargetIDs = ['dpad_slscratch', 'aButton_slscratch', 'bButton_slscratch'];

    // Find ID's in system
    for (var targetIndex = 0; targetIndex < TargetIDs.length; targetIndex ++)
    {
        for (var count = 0; count < runtime.sprites.length; count ++)
        {
            if (typeof(runtime.sprites[count]) == 'object' &&
                runtime.sprites[count].constructor == Sprite && 
                runtime.sprites[count].objName == TargetIDs[targetIndex])
            {
                // Set side switcher
                var SideSwitch = 1;
                TargetIDs[targetIndex].objName == 'dpad_slscratch' ? SideSwitch = -1 : SideSwitch = 1;

                // Set new positions
                runtime.sprites[count].scratchX = runtime.sprites[count].scratchOrigX - parseInt($('#player-container').css('left')) / Scalar();
                runtime.sprites[count].scratchY = runtime.sprites[count].scratchOrigY - parseInt($('#player-container').css('top')) / Scalar();
                if (typeof(runtime.sprites[count].updateTransform) !== 'undefined') { runtime.sprites[count].updateTransform(); }
            }
        }
    }

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

    // Debugging canvas
    $('#hit-canvas').css('-webkit-transform-origin', '0 0');
    $('#hit-canvas').css('-webkit-transform', 'scale(' + (Scalar()).toString() + ')');
    // $('#hit-canvas').css('left', (($('html').width() - $('#player-container').width() * Scalar()) / 2).toString() + 'px');
    // $('#hit-canvas').css('top', (($('html').height() - $('#player-container').height() * Scalar()) / 2).toString() + 'px');

    // Reposition controllers with new dimensions
    RepositionControllers();

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

    var recheckFunction = function()
    {
        if(typeof(runtime) !== "undefined" && runtime.projectLoaded)
        {
            runtime.greenFlag();
        } else {
            setTimeout(recheckFunction, 100);
        }
    }
	recheckFunction();
}

if(KeyValue("fullscreen") !== "false")
{
    // https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Using_full_screen_mode
    var initialGreenFlagFunction = function() {
        toggleFullScreen();
        $('#trigger-green-flag, #overlay').unbind("click",initialGreenFlagFunction);
    }
    $('#trigger-green-flag, #overlay').click(initialGreenFlagFunction);
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