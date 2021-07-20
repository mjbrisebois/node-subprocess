[back to README.md](README.md)

# Contributing

## Overview
This module is not intended to solve every possible child process use-case.  The primary purpose of
the `SubProcess` class is to provide deterministic controls for starting and stopping a child
process.


## Development

### Environment

- Developed using Node.js `v14.17.3`

### Building
No build required.  Vanilla JS only.

### Testing

To run all tests with logging
```
make test-debug
```

- `make test-unit-debug` - **Unit tests only**
- `make test-integration-debug` - **Integration tests only**

> **NOTE:** remove `-debug` to run tests without logging
