[back to README.md](../README.md)

# API Reference

### Module exports
```javascript
{
    SubProcess,
    TimeoutError,
}
```

## `new SubProcess( binary, ...args )`
Spawn a new child process.

Example usage
```javascript
let subprocess = new SubProcess({ "sleep", "10" );
```

#### *Alternative input* `new SubProcess( options )`

- `options.command` - (*required*) an array of strings used as the `args` to spawn the subprocess
- `options.env` - (*optional*) the environnment variables passed to subprocess
  - defaults to `process.env`
- `options.x_env` - (*optional*) specify defaults for `options.env`
- `options.env_x` - (*optional*) specify values that will override `options.env`
- `options.timeout` - (*optional*) the default timeout for `PromiseTimeout`; defaults to `1000`

Example usage with custom options
```javascript
let subprocess = new SubProcess({
   "name": "HTTP Server",
   "command": [ "python3", "m", "http.server", "8888" ],
   "x_env": {
       "LOG_LEVEL": "debug",            // allow the CLI to override this log level
   },
   "env_x": {
       "PYTHONUNBUFFERED": "true",      // CLI cannot override this
   },
});
```


### `<SubProcess>.pid : number`
The Process Identifier of the created child process.  Same as
[ChildProcess.pid](https://nodejs.org/api/child_process.html#child_process_subprocess_pid)


### `<SubProcess>.name : string`
The human-readable identifier given in the constructor options or defaults to the `this.binary`
value.


### `<SubProcess>.binary : string`
The first argument of the command array (aka: the executable path).


### `<SubProcess>.args : Array<string>`
The rest of the command arguments.


### `<SubProcess>.stdout : readline.Interface`
Emits each line coming from `stdout` of the child process.

Example usage
```javascript
subprocess.stdout.on("line", line => {
    console.log( line );
});
```


### `<SubProcess>.stderr : readline.Interface`
Emits each line coming from `stderr` of the child process.

Example usage
```javascript
subprocess.stderr.on("line", line => {
    console.error( line );
});
```


### `<SubProcess>.ready() -> PromiseTimeout<number>`
Returns a promise that settles when either the spawn or error event is emitted by the child process
(or the timeout occurs).  An error event will result in a promise rejection that raises the emitted
error.

Example usage
```javascript
let subprocess = new SubProcess( "sleep", "10" );

await subprocess.ready();
```

Example with spawn error
```javascript
let subprocess = new SubProcess( "non_existent_executable" );

await subprocess.ready();
// throw Error("spawn non_existent_executable ENOENT")
```


### `<SubProcess>.output( predicate, timeout, stream ) -> PromiseTimeout<string>`
Listen's to the child process

- `predicate` - (*required*) a function called on each line from the output stream.  Must return
  `true` to resolve promise.
  - also takes a `string`; the function is generated as `(line) => line.includes( predicate )`
- `timeout` - (*optional*) raise `TimeoutError` after # milliseconds; defaults to `this.options.timeout`
- `stream` - (*optional*) choose the stream to be checked (`stdout` or `stderr`); defaults to `stdout`

Returns a promise that settles when the predicate is satisfied (or the timeout occurs).

Example usage
```javascript
let subprocess = new SubProcess( "python3", "-um", "http.server", "8888" );

await subprocess.output("Serving HTTP on 0.0.0.0 port 8888");
```

Example usage with custom predicate function
```javascript
let subprocess = new SubProcess( "python3", "-um", "http.server", "8888" );

await subprocess.output( line => {
    return line.includes("Serving HTTP on 0.0.0.0 port 8888");
});
```


### `<SubProcess>.kill( signal, timeout ) -> PromiseTimeout<{ code, signal }>`
Send a signal to the child process and await the close event.

- `signal` - (*optional*) signal identifier; defaults to `SIGTERM`
- `timeout` - (*optional*) raise `TimeoutError` after # milliseconds; defaults to `this.options.timeout`

Returns a promise that settles when the close event is emitted (or the timeout occurs).

Example usage
```javascript
let subprocess = new SubProcess( "python3", "-um", "http.server", "8888" );

await subprocess.kill("SIGINT");
```


### `<SubProcess>.stop( timeout ) -> Promise<{ code, signal }>`
This method ensures that the child process is killed.  First the process is given a graceful
termination signal; if that doesn't result in a close event within half of the given timeout, then
the process is terminated.

- `timeout` - (*optional*) raise `TimeoutError` after # milliseconds; defaults to `this.options.timeout`

Returns a promise that settles when the close event is emitted.

Example usage
```javascript
let subprocess = new SubProcess( "python3", "-um", "http.server", "8888" );

await subprocess.stop();
```


### `<SubProcess>.close( timeout ) -> Promise<{ code, signal }>`
Wait for the process to close.

- `timeout` - (*optional*) raise `TimeoutError` after # milliseconds; defaults to no timeout

Returns a promise that settles when the close event is emitted.

Example usage
```javascript
let subprocess = new SubProcess( "sleep", "10" );

await subprocess.close();
```


### `<SubProcess>.toString() -> string`
String representation of this instance.

Example usage
```javascript
let subprocess = new SubProcess( "sleep", "10" );

subprocess.toString();
// "[PID: 132885] (sleep 10)"
```
