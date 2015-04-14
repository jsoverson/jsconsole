var time = -800;
var interval = 800;

var repl = new Console("console");

repl.wrapLog(console);


delayExecution('2');
delayExecution('var a = {x : 2, y : 3}');
delayExecution('a');
delayExecution('function foo(){\n  console.log("Hi %s","world");\n}');
delay(function(){repl.resetInput('foo(); // press enter');});

function delay(fn) {
    setTimeout(fn, time += interval);
}
function delayExecution(code) {
    delay(function(){
        repl.exec(code)
    })
}
