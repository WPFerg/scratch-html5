// Copyright (C) 2013 Massachusetts Institute of Technology
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 2,
// as published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

// Scratch HTML5 Player
// Primitives.js
// Tim Mickel, July 2011

// Provides the basic primitives for the interpreter and loads in the more
// complicated primitives, e.g. MotionAndPenPrims.

'use strict';

var Primitives = function() {}

Primitives.prototype.addPrimsTo = function(primTable) {
    // Math primitives
    primTable['+']                  = function(b) { return interp.numarg(b, 0) + interp.numarg(b, 1); };
    primTable['-']                  = function(b) { return interp.numarg(b, 0) - interp.numarg(b, 1); };
    primTable['*']                  = function(b) { return interp.numarg(b, 0) * interp.numarg(b, 1); };
    primTable['/']                  = function(b) { return interp.numarg(b, 0) / interp.numarg(b, 1); };
    primTable['%']                  = this.primModulo;
    primTable['randomFrom:to:']     = this.primRandom;
    primTable['<']                  = function(b) { return (interp.numarg(b, 0) < interp.numarg(b, 1)); };
    primTable['=']                  = function(b) { return (interp.arg(b, 0) == interp.arg(b, 1)); };
    primTable['>']                  = function(b) { return (interp.numarg(b, 0) > interp.numarg(b, 1)); };
    primTable['&']                  = function(b) { return interp.boolarg(b, 0) && interp.boolarg(b, 1); };
    primTable['|']                  = function(b) { return interp.boolarg(b, 0) || interp.boolarg(b, 1); };
    primTable['not']                = function(b) { return !interp.boolarg(b, 0); };
    primTable['abs']                = function(b) { return Math.abs(interp.numarg(b, 0)); };
    primTable['sqrt']               = function(b) { return Math.sqrt(interp.numarg(b, 0)); };

    primTable['\\\\']               = this.primModulo;
    primTable['rounded']            = function(b) { return Math.round(interp.numarg(b, 0)); };
    primTable['computeFunction:of:'] = this.primMathFunction;

    // String primitives
    primTable['concatenate:with:']  = function(b) { return '' + interp.arg(b, 0) + interp.arg(b, 1); };
    primTable['letter:of:']         = this.primLetterOf;
    primTable['stringLength:']      = function(b) { return interp.arg(b, 0).length; };

    // Procedure primitives
    primTable['call']               = this.callProcedure;
    primTable['procDef']            = this.procDef;
    primTable['getParam']           = this.getParam;

    new VarListPrims().addPrimsTo(primTable);
    new MotionAndPenPrims().addPrimsTo(primTable);
    new LooksPrims().addPrimsTo(primTable);
    new SensingPrims().addPrimsTo(primTable);
    new SoundPrims().addPrimsTo(primTable);
}

Primitives.prototype.primRandom = function(b) {
    var n1 = interp.numarg(b, 0);
    var n2 = interp.numarg(b, 1);
    var low = n1 <= n2 ? n1 : n2;
    var hi = n1 <= n2 ? n2 : n1;
    if (low == hi) return low;
    // if both low and hi are ints, truncate the result to an int
    if (Math.floor(low) == low && Math.floor(hi) == hi) {
        return low + Math.floor(Math.random() * (hi + 1 - low));
    }
    return Math.random() * (hi - low) + low;
}

Primitives.prototype.primLetterOf = function(b) {
    var s = interp.arg(b, 1);
    var i = interp.numarg(b, 0) - 1;
    if (i < 0 || i >= s.length) return '';
    return s.charAt(i);
}

Primitives.prototype.primModulo = function(b) {
    var dividend = interp.numarg(b, 1);
    var n = interp.numarg(b, 0) % dividend;
    if (n / dividend < 0) n += dividend;
    return n;
}

Primitives.prototype.primMathFunction = function(b) {
    var op = interp.arg(b, 0);
    var n = interp.numarg(b, 1);
    switch(op) {
        case 'abs': return Math.abs(n);
        case 'sqrt': return Math.sqrt(n);
        case 'sin': return Math.sin(n * Math.PI / 180);
        case 'cos': return Math.cos(n * Math.PI / 180);
        case 'tan': return Math.tan(n * Math.PI / 180);
        case 'asin': return Math.asin(n) * 180 / Math.PI;
        case 'acos': return Math.acos(n) * 180 / Math.PI;
        case 'atan': return Math.atan(n) * 180 / Math.PI;
        case 'ln': return Math.log(n);
        case 'log': return Math.log(n) / Math.LN10;
        case 'e ^': return Math.exp(n);
        case '10 ^': return Math.exp(n * Math.LN10);
        case 'floor': return Math.floor(n);
        case 'ceiling': return Math.ceil(n);
    }
    return 0;
}

Primitives.prototype.callProcedure = function(b) {

    // Gather thread information
    var targetSprite = interp.activeThread.target;
    var currentThreadState = interp.activeThread;

    // Find activeThread in threads and halt it
    var newThreads = [];
    var threadCount = interp.threads.length;
    for (var count = 0; count < threadCount; count ++)
    {
        if (interp.threads[count] != interp.activeThread)
        {
            newThreads.push(interp.threads[count]);
        }
    }
    interp.threads = newThreads;

    // Locate stack to call in sprite, clone and apply new parameters in thread
    var stackToCall = null;
    var stackCount = targetSprite.stacks.length;
    for (var count = 0; count < stackCount; count ++)
    {
        if ( (targetSprite.stacks[count].op == "procDef") && (interp.arg(b, 0) == interp.arg(targetSprite.stacks[count], 0)) )
        {

            // Start thread 
            interp.startThread(targetSprite.stacks[count], targetSprite);

            // Generate parameters and save next block link
            var paramParsedFirstBlock = new Block(passedParams);
            var nextBlockLink = interp.activeThread.firstBlock.nextBlock;

            var alternateFirstBlock = new Block(['']);
            //alternateFirstBlock = $.extend(true, alternateFirstBlock, interp.activeThread.firstBlock);
            alternateFirstBlock.args = [];
            alternateFirstBlock.isLoop = targetSprite.stacks[count].isLoop;
            alternateFirstBlock.nextBlock = targetSprite.stacks[count].nextBlock;
            alternateFirstBlock.op = targetSprite.stacks[count].op;
            alternateFirstBlock.primFcn = targetSprite.stacks[count].primFcn;
            alternateFirstBlock.subStack2 = targetSprite.stacks[count].subStack2;
            alternateFirstBlock.substack = targetSprite.stacks[count].substack;
            alternateFirstBlock.tmp = targetSprite.stacks[count].tmp;

            var alternateParamBlock = new Block(['']);
            alternateParamBlock.isLoop = targetSprite.stacks[count].args[2].isLoop;
            alternateParamBlock.nextBlock = targetSprite.stacks[count].nextBlock;
            alternateParamBlock.primFcn = targetSprite.stacks[count].args[2].primFcn;
            alternateParamBlock.subStack2 = targetSprite.stacks[count].args[2].subStack2;
            alternateParamBlock.substack = targetSprite.stacks[count].args[2].substack;
            alternateParamBlock.tmp = targetSprite.stacks[count].args[2].tmp;

            // Make sure params are copied
            if (passedParams.length > 0)
            {
                alternateParamBlock.op = passedParams[0];
                for (var count2 = 1; count2 < passedParams.length; count2 ++)
                var argCount = b.args.length;
                for (var count2 = 1; count2 < argCount; count2 ++)
                {
                    if (passedParams[count2] == 'object')
                    {
                        alternateParamBlock.args[count2-1] = passedParams[count2].primFcn(passedParams[count2]);
                    } else {
                        alternateParamBlock.args[count2-1] = passedParams[count2];
                    }
                }

            }

            // Link two alternate blocks
            alternateFirstBlock.args.push(targetSprite.stacks[count].args[0]);
            alternateFirstBlock.args.push(targetSprite.stacks[count].args[1]);
            alternateFirstBlock.args.push(alternateParamBlock);
            alternateFirstBlock.args.push(targetSprite.stacks[count].args[3]);

            // Apply parameters to active thread
            interp.activeThread.firstBlock = alternateFirstBlock;
            interp.activeThread.nextBlock = alternateFirstBlock;

            // Add existing thread to stack
            interp.activeThread.paramNestBlockIndex = -1;
            interp.activeThread.stack = currentThreadState.stack;
            interp.activeThread.stack.push(currentThreadState);
            return;

        }
    }

}

Primitives.prototype.procDef = function(b) {

    // Do nothing

}

Primitives.prototype.getParam = function(b) {

    // Currently uses current nest value and does not access procedures which the currently called procedure nests in. These outter procedures
    // hold the value wanted, the inner called procedure does not.

    // Method to return the index of requested parameter
    function FindIndex(ThreadStartBlock, ParamName)
    {
        if (ThreadStartBlock.args.length == 4)
        {
            var argCount = ThreadStartBlock.args[1].args.length;
            if (argCount > 0 || typeof(ThreadStartBlock.args[1].op) != 'undefined')
            {
                if (ThreadStartBlock.args[1].op == ParamName)
                {
                    return 0;
                } else {
                    for (var count = 0; count < argCount; count ++)
                    {
                        if (ThreadStartBlock.args[1].args[count] == ParamName)
                        {
                            return (count + 1);
                        }
                    }
                }
            }
        }
        return -1;
    }

    // Method to return the requested parameter value
    function retrieveParameter(Block, ThreadStartBlock)
    {

        // Calculate a few things first
        var indexMatch = FindIndex(ThreadStartBlock, interp.arg(b, 0));

        // Break if no index found
        if (indexMatch == -1)
        {
            return -1;
        }

        // Return appropriate value
        if (indexMatch == 0)
        {
            return ThreadStartBlock.args[2].op;
        } else {
            return ThreadStartBlock.args[2].args[indexMatch-1];
        }
    }

    // Update param list block
    interp.activeThread.paramNestBlockIndex = -1; // tempory fix
    if (interp.activeThread.paramNestBlockIndex == -1)
    {
        interp.activeThread.paramNestBlockIndex = interp.activeThread.stack.length;
    } else {
        interp.activeThread.stepOutParamNest();
    }

    var debugString = 'T' + interp.activeThread.paramNestBlockIndex + ' ~ ' + interp.activeThread.firstBlock.args[0].split(' ')[0] + ' > '
                      + interp.activeThread.getParamNestBlock().args[0].split(' ')[0] + '[' + interp.arg(b, 0);

    // Get the suspected parameter
    b = retrieveParameter(b, interp.activeThread.getParamNestBlock());

    // Determine if any recusrive call is needed
    // if (typeof(b) == 'object' && typeof(b) !== 'number')
    // {
    //     return (b.primFcn(b));
    // } else {
    //     return b;
    // }

    // No recursive calls should be needed now absolute values are stored in params
    return b;

}
