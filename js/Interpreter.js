/*global $:false, runtime:false,XMLHttpRequest:false,SoundDecoder:false,Instr:false,OffsetBuffer:false,Stage:false,Sprite:false,List:false,Reporter:false,interp:false,WAVFile:false*/

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
// Interpreter.js
// Tim Mickel, July 2011
// Based on the original by John Maloney

'use strict';

var Block = function(opAndArgs, optionalSubstack) {
    this.op = opAndArgs[0];
    this.primFcn = interp.lookupPrim(this.op);
    this.args = opAndArgs.slice(1); // arguments can be either or constants (numbers, boolean strings, etc.) or expressions (Blocks)
    this.isLoop = false; // set to true for loop blocks the first time they run
    this.substack = optionalSubstack;
    this.subStack2 = null;
    this.nextBlock = null;
    this.tmp = -1;
    interp.fixArgs(this);
};

var Thread = function(block, target) {
    this.ID = runtime.requestThreadID(); // distinguishes blocks from eachother and useful in debugging
    this.nextBlock = block; // next block to run; null when thread is finished
    this.firstBlock = block;
    this.stack = []; // stack of enclosing control structure blocks
    this.target = target; // target object running the thread
    this.tmp = null; // used for thread operations like Timer
    this.tmpObj = []; // used for Sprite operations like glide
    this.firstTime = true;
    this.paused = false;
};

var Interpreter = function() {
    // Interpreter state
    this.primitiveTable = {}
    this.variables = {};
    this.threads = [];
    this.activeThread = new Thread(null);
    this.WorkTime = 0.75 * 30;
    this.currentMSecs = null;
    this.timer = new Timer();
    this.yield = false;
    this.isWaiting = false;
    this.doRedraw = false;
    this.opCount = 0; // used to benchmark the interpreter
    this.debugOps = false;
    this.debugFunc = null;
    this.opCount2 = 0;
};

// Utilities for building blocks and sequences of blocks
Interpreter.prototype.fixArgs = function(b) {
    // Convert the arguments of the given block into blocks or substacks if necessary.
    // A block argument can be a constant (numbers, boolean strings, etc.), an expression (Blocks), or a substack (an array of blocks).
    var newArgs = [];
    var argLength = b.args.length;
    for (var i = 0; i < argLength; i++) {
        var arg = b.args[i];
        if (arg && arg.constructor == Array) {
            if ((arg.length > 0) && (arg[0].constructor == Array)) {
                // if first element arg is itself an array, then arg is a substack
                if (!b.substack) {
                    b.substack = this.makeBlockList(arg);
                } else {
                    b.substack2 = this.makeBlockList(arg);
                }
            } else {
                // arg is a block
                newArgs.push(new Block(arg));
            }
        } else {
            newArgs.push(arg); // arg is a constant
        }
    }
    b.args = newArgs;
};

Interpreter.prototype.makeBlockList = function(blockList) {
    var firstBlock = null, lastBlock = null;
    var blockListLength = blockList.length;
    for (var i = 0; i < blockListLength; i++) {
        var b = new Block(blockList[i]);
        if (firstBlock == null) firstBlock = b;
        if (lastBlock) lastBlock.nextBlock = b;
        lastBlock = b;
    }
    return firstBlock;
};

// The Interpreter proper
Interpreter.prototype.stepThreads = function() {
    var startTime;
    startTime = this.currentMSecs = this.timer.time();
    this.doRedraw = false;
    if (this.threads.length == 0) return;

    while ((this.currentMSecs - startTime) < this.WorkTime && !this.doRedraw) {
        var threadStopped = false;
        var runnableCount = 0;

        for (var a = this.threads.length-1; a >= 0; --a) {
            this.activeThread = this.threads[a];
            this.isWaiting = false;
            this.stepActiveThread();
            if (!this.activeThread || this.activeThread.nextBlock == null) {
                threadStopped = true;
            }
            if(!this.isWaiting) runnableCount++;
            var sprite = (this.activeThread ? this.activeThread.target : null);
            if(sprite && sprite.needsUpdate)
            {
                sprite.renderTransform();
            }
        }
        if (threadStopped) {
            var newThreads = [];
            for (var a = this.threads.length-1; a >= 0; --a) {
                if (this.threads[a].nextBlock != null || this.threads[a].stack.length > 0) {
                    newThreads.push(this.threads[a]);
                }
            }
            this.threads = newThreads;
            if (this.threads.length == 0) return;
        }
        if(runnableCount == 0) return;
        this.currentMSecs = this.timer.time();
    }
};

Interpreter.prototype.stepActiveThread = function() {
    // Run the active thread until it yields.
    if (typeof(this.activeThread) == 'undefined') {
        return;
    }
    var b = this.activeThread.nextBlock;
    if (b == null)
    {
        while (!b)
        {
            if (this.activeThread.stack.length === 0) {
                this.activeThread.nextBlock = null;
                return;
            } else {
                b = this.activeThread.stack.pop();
                if (b != 'undefined' && b != null)
                {
                    if (b.isLoop) {
                        this.activeThread.nextBlock = b; // preserve where it left off
                        return;
                    } else {
                        b = b.nextBlock; // skip and continue for non looping blocks
                    }
                }
            }
            //return;
        }
    }
    this.yield = false;
    while (true) {
        if (this.activeThread.paused) return;

        ++this.opCount;
        // Advance the "program counter" to the next block before running the primitive.
        // Control flow primitives (e.g. if) may change activeThread.nextBlock.
        this.activeThread.nextBlock = b.nextBlock;
        if (this.debugOps && this.debugFunc) {
            var finalArgs = [];
            argLength = b.args.length;
            for (var i = 0; i < argLength; ++i) {
                finalArgs.push(this.arg(b, i));
            }

            this.debugFunc(this.opCount2, b.op, finalArgs);
            ++this.opCount2;
        }

        // if (b.op !== 'doWaitUntil ')
        // {
        //     var displayArgs = '';
        //     for (var count = 0; count < b.args.length; count ++)
        //     {
        //         displayArgs = displayArgs + b.args[count];
        //         if (count < b.args.length-1) displayArgs = displayArgs + ', ';
        //     }
        //     var stackTrace = '';
        //     for (var count = 0; count < this.activeThread.stack.length; count ++)
        //     {
        //         if (typeof(this.activeThread.stack[count]) !== 'undefined')
        //         {
        //             if (typeof(this.activeThread.stack[count].firstBlock) !== 'undefined' && this.activeThread.stack[count].firstBlock !== null)
        //             {
        //                 var name = this.activeThread.stack[count].firstBlock.op;
        //                 if (name == 'procDef')
        //                 {
        //                     name = this.activeThread.stack[count].firstBlock.args[0].split(' ')[0];
        //                 }
        //                 stackTrace = stackTrace + name + ' => ';
        //             }
        //         }
        //     }
        //     if (typeof(this.activeThread.firstBlock) !== 'undefined')
        //     {
        //         var name = this.activeThread.firstBlock.op;
        //         if (name == 'procDef')
        //         {
        //             name = this.activeThread.firstBlock.args[0].split(' ')[0];
        //         }

        //         if (stackTrace == '')
        //         {
        //             stackTrace = name + ' => ';
        //         } else {
        //             stackTrace = stackTrace + name + ' => ';
        //         }
        //     }
        //     if (typeof(this.activeThread) !== 'undefined')
        //     {
        //         console.log('Executing: ' + this.activeThread.target.objName + ' :|: ' + stackTrace + b.op + ' [' + displayArgs + ']');
        //     } else {
        //         console.log('Executing: ' + stackTrace + b.op + ' [' + displayArgs + ']');
        //     }
        // }

        b.primFcn(b);
        if (this.yield) { this.activeThread.nextBlock = b; return; }
        b = this.activeThread.nextBlock; // refresh local variable b in case primitive did some control flow
        while (!b) {
            // end of a substack; pop the owning control flow block from stack
            // Note: This is a loop to handle nested control flow blocks.

            // yield at the end of a loop or when stack is empty
            if (this.activeThread.stack.length === 0) {
                this.activeThread.nextBlock = null;
                return;
            } else {
                var poppedThread = this.activeThread.stack.pop();
                b = poppedThread;
                if (b != 'undefined' && b != null)
                {
                    if (b.isLoop) {
                        this.activeThread.nextBlock = b; // preserve where it left off
                        return;
                    } else {
                        if (typeof(poppedThread.firstBlock) !== 'undefined')
                        {
                            if (typeof(poppedThread.firstBlock.op) !== 'undefined')
                            {
                                if (poppedThread.firstBlock.op == 'procDef')
                                {
                                    this.activeThread.firstBlock = poppedThread.firstBlock;
                                }
                            }
                        }
                        b = b.nextBlock; // skip and continue for non looping blocks
                    }
                }
            }
        }
    }
};

Interpreter.prototype.toggleThread = function(b, targetObj) {
    var newThreads = [], wasRunning = false;
    var threadLength = this.threads.length;
    for (var i = 0; i < threadLength; i++) {
        if (this.threads[i].stack[0] == b) {
            wasRunning = true;
        } else {
            newThreads.push(this.threads[i]);
        }
    }
    this.threads = newThreads;
    if (!wasRunning && targetObj !== null) {
        this.startThread(b, targetObj);
    } else {
        // Shift active thread to new thread
        this.activeThread = this.threads[0];
    }
}

Interpreter.prototype.startThread = function(b, targetObj) {
    this.activeThread = new Thread(b, targetObj);
    this.threads.push(this.activeThread);
};

Interpreter.prototype.restartThread = function(b, targetObj) {
    // used by broadcast; stop any thread running on b, then start a new thread on b
    var newThread = new Thread(b, targetObj);
    var wasRunning = false;
    var threadLength = this.threads.length;
    for (var i = 0; i < threadLength; i++) {
        if (this.threads[i].stack[0] == b) {
            this.threads[i] = newThread;
            wasRunning = true;
        }
    }
    if (!wasRunning) {
        this.threads.push(newThread);
    }
};

Interpreter.prototype.arg = function(block, index) {
    var arg = block.args[index];
    if ((typeof(arg) == 'object') && (arg.constructor == Block)) {
        ++this.opCount;
        if (this.debugOps && this.debugFunc) {
            var finalArgs = [];
            var argLength = arg.args.length;
            for (var i = 0; i < argLength; ++i) {
                finalArgs.push(this.arg(arg, i));
            }

            this.debugFunc(this.opCount2, arg.op, finalArgs);
            ++this.opCount2;
        }
        return arg.primFcn(arg); // expression
    }
    return arg;
};

Interpreter.prototype.numarg = function(block, index) {
    var arg = Number(this.arg(block, index));
    if (arg !== arg) {
        return 0;
    }
    return arg;
};

Interpreter.prototype.boolarg = function(block, index) {
    var arg = this.arg(block, index);
    if (typeof arg === 'boolean') {
        return arg;
    } else if (typeof arg === 'string') {
        return !(arg === '' || arg === '0' || arg.toLowerCase() === 'false');
    }
    return Boolean(arg);
};

Interpreter.prototype.targetSprite = function() {
    return this.activeThread.target;
};

Interpreter.prototype.targetStage = function() {
    return runtime.stage;
};

// Timer
Interpreter.prototype.startTimer = function(secs) {
    var waitMSecs = 1000 * secs;
    if (waitMSecs < 0) waitMSecs = 0;
    this.activeThread.tmp = this.currentMSecs + waitMSecs; // end time in milliseconds
    this.activeThread.firstTime = false;
    this.yield = true;
    this.isWaiting = true;
};

Interpreter.prototype.checkTimer = function() {
    // check for timer expiration and clean up if expired. return true when expired
    if (this.currentMSecs >= this.activeThread.tmp) {
        // time expired
        this.activeThread.tmp = 0;
        this.activeThread.firstTime = true;
        return true;
    } else {
        this.yield = true;
        this.isWaiting = true;
        return false;
    }
};

Interpreter.prototype.redraw = function() {
    this.doRedraw = true;
};

// Primitive operations
Interpreter.prototype.initPrims = function() {
    this.primitiveTable = {};
    this.primitiveTable['whenGreenFlag']       = this.primNoop;
    this.primitiveTable['whenKeyPressed']      = this.primNoop;
    this.primitiveTable['whenClicked']         = this.primNoop;
    this.primitiveTable['if']                  = function(b) { if (interp.boolarg(b, 0)) interp.startSubstack(b); };
    this.primitiveTable['doForever']           = function(b) { interp.startSubstack(b, true); };
    this.primitiveTable['doForeverIf']         = function(b) { if (interp.boolarg(b, 0)) interp.startSubstack(b, true); else interp.yield = true; };
    this.primitiveTable['doIf']                = function(b) { if (interp.boolarg(b, 0)) interp.startSubstack(b); };
    this.primitiveTable['doRepeat']            = this.primRepeat;
    this.primitiveTable['doIfElse']            = function(b) { if (interp.boolarg(b, 0)) interp.startSubstack(b); else interp.startSubstack(b, false, true); };
    this.primitiveTable['doWaitUntil']         = function(b) { if (!interp.boolarg(b, 0)) interp.yield = true; };
    this.primitiveTable['doUntil']             = function(b) { if (!interp.boolarg(b, 0)) interp.startSubstack(b, true); };
    this.primitiveTable['doReturn']            = function(b) { interp.activeThread = new Thread(null); };
    this.primitiveTable['stopAll']             = function(b) { interp.activeThread = new Thread(null); interp.threads = []; }
    this.primitiveTable['stopScripts']         = this.stopScripts;
    this.primitiveTable['whenIReceive']        = this.primNoop;
    this.primitiveTable['broadcast:']          = function(b) { interp.broadcast(b, false); };
    this.primitiveTable['doBroadcastAndWait']  = function(b) { interp.broadcast(b, true); };
    this.primitiveTable['wait:elapsed:from:']  = this.primWait;

    // added by John:
    this.primitiveTable['showBubble'] = function(b) { console.log(interp.arg(b, 1)); };
    this.primitiveTable['timerReset'] = function(b) { interp.timerBase = Date.now(); };
    this.primitiveTable['timer'] = function(b) { return (Date.now() - interp.timerBase) / 1000; };

    new Primitives().addPrimsTo(this.primitiveTable);
};

Interpreter.prototype.timerBase = Date.now();
Interpreter.prototype.lookupPrim = function(op) {
    var fcn = interp.primitiveTable[op];
    if (fcn == null) fcn = function(b)
    {
        console.log('not implemented: ' + b.op);
    };
    return fcn;
};

Interpreter.prototype.primNoop = function(b) { console.log(b.op); };

Interpreter.prototype.primWait = function(b) {
    if (interp.activeThread.firstTime) {
        interp.startTimer(interp.numarg(b, 0));
    } else {
        interp.checkTimer();
    }
};

Interpreter.prototype.primRepeat = function(b) {
    if (b.tmp == -1) {
        b.tmp = Math.max(interp.numarg(b, 0), 0); // Initialize repeat count on this block
    }
    if (b.tmp > 0) {
        b.tmp -= 1; // decrement count
        interp.startSubstack(b, true);
    } else {
        // Done executing this repeat block for this round
        b.tmp = -1;
        b = null;
    }
};

Interpreter.prototype.broadcast = function(b, waitFlag) {
    var pair;
    if (interp.activeThread.firstTime) {
        var receivers = [];
        var msg = String(interp.arg(b, 0)).toLowerCase();
        var findReceivers = function(stack, target) {
            if ((stack.op == 'whenIReceive') && (stack.args[0].toLowerCase() == msg)) {
                receivers.push([stack, target]);
            }
        }
        runtime.allStacksDo(findReceivers);
        var receiversLength = receivers.length;
        for (var pair = 0; pair < receiversLength; pair++) {
            interp.restartThread(receivers[pair][0], receivers[pair][1]);
        }
        if (!waitFlag) return;
        interp.activeThread.tmpObj = receivers;
        interp.activeThread.firstTime = false;
    }
    var done = true;
    var tmpObjLength = interp.activeThread.tmpObj.length;
    for (var pair = 0; pair < tmpObjLength; pair++) {
        if (interp.isRunning(interp.activeThread.tmpObj[pair][0])) {
            done = false;
        }
    }
    if (done) {
        interp.activeThread.tmpObj = null;
        interp.activeThread.firstTime = true;
    } else {
        interp.yield = true;
    }
};

Interpreter.prototype.isRunning = function(b) {
    var threadLength = interp.threads.length;
    for (var t = 0; t < threadLength; t++) {
        if (interp.threads[t].firstBlock == b) {
            return true;
        }
    }
    return false;
};

Interpreter.prototype.startSubstack = function(b, isLoop, secondSubstack) {
    // Start the substack of a control structure command such as if or forever.
    b.isLoop = !!isLoop;
    this.activeThread.stack.push(b); // remember the block that started the substack
    if (!secondSubstack) {
        this.activeThread.nextBlock = b.substack;
    } else {
        this.activeThread.nextBlock = b.substack2;
    }
};

Interpreter.prototype.stopScripts = function(b) {
    var target = interp.arg(b, 0);
    switch(target)
    {
        case "this script":
            var threadIndex = interp.threads.indexOf(interp.activeThread);
            if(threadIndex !== -1)
            {
                interp.threads.splice(threadIndex,1);
                interp.activeThread = new Thread(null);
            }
            break;
        case "other scripts in sprite":
            var sprite = interp.activeThread.target;
            var currentThreadIndex = sprite.stacks.indexOf(interp.activeThread.firstBlock);
            // Create a shallow copy of the sprite's scripts so we can use splice without destroying the original contents
            var otherThreads = sprite.stacks.slice(0);
            // Remove the current thread
            otherThreads.splice(currentThreadIndex, 1);

            // For each thread, find that thread in interp.threads and remove it.
            var otherThreadLength = otherThreads.length;
            for(var otherThreadIndex = 0; otherThreadLength < otherThreadLength; otherThreadIndex++)
            {   
                var otherThread = otherThreads[otherThreadIndex];

                var threadIndex = -1;

                // Find thread index in interp.threads
                var threadLength = interp.threads.length
                for(var interpThreadIndex = 0; interpThreadIndex < threadLength; interpThreadIndex++)
                {
                    var thread = interp.threads[interpThreadIndex];

                    if(thread.firstBlock === otherThread)
                    {
                        threadIndex = interpThreadIndex;
                        break;
                    }
                }

                // If the thread's been found interp.threads, remove it
                if(threadIndex !== -1)
                {
                    interp.threads.splice(threadIndex,1);
                }
            }
            break;
        case "all":
            interp.activeThread = new Thread(null);
            interp.threads = [];
            break;
        default:
            console.log("stopScripts hasn't implemented: " + target);
            break;
    }
}
