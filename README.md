[![](https://img.shields.io/npm/v/@whi/subprocess/latest?style=flat-square)](http://npmjs.com/package/@whi/subprocess)

# `new SubProcess( binary, ...args )`
A node module that helps spawn child processes with deterministic controls.

[![](https://img.shields.io/github/issues-raw/mjbrisebois/node-subprocess?style=flat-square)](https://github.com/mjbrisebois/node-subprocess/issues)
[![](https://img.shields.io/github/issues-closed-raw/mjbrisebois/node-subprocess?style=flat-square)](https://github.com/mjbrisebois/node-subprocess/issues?q=is%3Aissue+is%3Aclosed)
[![](https://img.shields.io/github/issues-pr-raw/mjbrisebois/node-subprocess?style=flat-square)](https://github.com/mjbrisebois/node-subprocess/pulls)


## Overview
This module is intended to provide more deterministic controls to the native
[`child_process`](https://nodejs.org/api/child_process.html) library.

### Features

- Close subprocess if parent process exits or receives `SIGINT`
- Line emitter for `stdout` and `stderr` instead of data chunks
- Await spawn success or error with timeout
- Await certain output with timeout
- Send signal and await close with a timeout
- Deterministic kill with timeout
- Await close event


## Install

```bash
npm i @whi/subprocess
```

## Basic Usage

```javascript
let subprocess = new SubProcess( "python3", "-um", "http.server", "8888" );

subprocess.stdout( line => {
    console.log( line );
});

subprocess.stderr( line => {
    console.error( line );
});

await subprocess.ready();

await subprocess.output("Serving HTTP on 0.0.0.0 port 8888");

await subprocess.stop();
```


### API Reference

See [docs/API.md](docs/API.md)

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)
