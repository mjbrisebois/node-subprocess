const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: (!__dirname.includes("/node_modules/") && process.env.LOG_LEVEL ) || 'fatal',
});

const EventEmitter			= require('events');
const readline				= require('readline');
const { PromiseTimeout,
	TimeoutError }			= require('@whi/promise-timeout');
const { spawn }				= require('child_process');


const SUBPROCESS_DEFAULTS		= {
    "x_env": {}, // default values for env vars
    "env_x": {}, // extensions that take precedent over env vars
    "env": process.env,
    "timeout": 1_000,
};


class SubProcess extends EventEmitter {
    constructor ( options_or_binary, ...args ) {
	super();

	if ( typeof options_or_binary === "string" ) {
	    this.binary			= options_or_binary;
	    this.args			= args;
	    this.options		= Object.assign( {}, SUBPROCESS_DEFAULTS );
	}
	else {
	    let opts			= options_or_binary;

	    if ( !Array.isArray( opts.command ) )
		throw new Error(`opts.command must be an array of strings: not type ${typeof opts.command}`);

	    if ( opts.command.length === 0 )
		throw new Error(`opts.command must have at least 1 string indicating the binary`);;

	    this.binary			= opts.command[0];
	    this.args			= opts.command.slice( 1 );
	    delete opts.command;
	    this.options		= Object.assign( {}, SUBPROCESS_DEFAULTS, opts );
	}

	let opts			= this.options;

	this.name			= opts.name || this.binary;
	this._stopped			= false;
	this._output_promises		= [];
	this._process			= spawn( this.binary, this.args, {
	    "env": Object.assign( {}, opts.x_env, opts.env, opts.env_x ),
	    "detached": false,
	    "shell": false,
	});

	this.pid			= this._process.pid || null;


	this.stdout			= readline.createInterface({
	    input: this._process.stdout.setEncoding("utf8"),
	});
	this.stderr			= readline.createInterface({
	    input: this._process.stderr.setEncoding("utf8"),
	});


	this._setup_ready_handle();
	this._setup_exit_handles();

	[
	    "close",
	    "disconnect",
	    "exit",
	    "message",
	    "spawn",
	].forEach( event => {
	    this._process.on( event, (...args) => {
		log.silly("Forwarding event '%s' from subprocess to self", event );
		this.emit( event, ...args );
	    });
	});
    }

    _setup_ready_handle () {
	const self			= this;
	this._ready			= new Promise( (f,r) => {
	    function on_spawn () {
		cleanup();

		log.normal("%s subprocess has been spawned", self.name );
		f( self._process.pid );
	    }
	    function on_error (err) {
		cleanup();

		log.error("%s >> %s", self.toString(), String(err) );
		r( err );
	    }

	    function cleanup () {
		self._process.off("spawn", on_spawn );
		self._process.off("error", on_error );

		// We are adding this after the spawn event so that we don't have redundant spawn
		// errors.  This is because of Node's special handling of 'error' events.
		//
		//   - See https://nodejs.org/api/events.html#events_error_events for more info
		//
		self._process.on("error", (...args) => {
		    log.silly("Forwarding event 'error' from subprocess to self");
		    self.emit("error", ...args );
		});
	    }

	    self._process.once("spawn", on_spawn );
	    self._process.once("error", on_error );
	});
    }

    _setup_exit_handles () {
	const self			= this;

	async function handle_exit ( ctx, code, signal ) {
	    log.silly("%s >> Handle exit event: %s (%s)", ctx, code, signal );

	    log.warn("Wait for process to close");
	    await self.close();

	    if ( self._output_promises.length > 0 ) {
		log.warn("Stopping %s output awaiter(s) because the process closed", self._output_promises.length );
		let err			= new Error(`Process exited with '${code}' while waiting for output`);
		for ( let reject of self._output_promises ) {
		    reject( err );
		}
	    }

	    if ( !self._process.killed )
		await self.kill();
	}
	const parent_handle_exit		= handle_exit.bind(this, "parent:exit");
	const parent_handle_sigint		= handle_exit.bind(this, "parent:SIGINT");
	const child_handle_exit			= handle_exit.bind(this, "child:exit");

	process.once("exit",		parent_handle_exit );
	process.once('SIGINT',		parent_handle_sigint );
	this._process.on('exit',	child_handle_exit );

	this._closed			= new Promise( (f,r) => {
	    this._process.once("close", (code, signal) => {
		log.normal("%s triggered 'close' event with status: %s (%s)", this.toString(), code, signal );

		log.debug("Removing contingency exit handling");
		process.off("exit",		parent_handle_exit );
		process.off("SIGINT",		parent_handle_sigint );
		self._process.off("exit",	child_handle_exit );

		f({
		    code,
		    signal
		});
	    });
	});
    }

    ready ( timeout ) {
	if ( timeout === undefined )
	    timeout			= this.options.timeout;

	return new PromiseTimeout( this._ready.then.bind(this._ready), timeout, "spawn process" );
    }

    output ( checker_callback, timeout, stream ) {
	const self			= this;

	if ( stream === undefined )
	    stream			= this.stdout;
	else if ( ["stdout", "stderr"].includes( stream ) )
	    stream			= this[stream];
	else
	    throw new Error(`Unknown stream '${stream}'; must be stdout or stderr`);

	if ( typeof checker_callback === "string" ) {
	    let str			= checker_callback;
	    checker_callback		= ( line ) => line.includes( str );
	}

	if ( timeout === undefined )
	    timeout			= this.options.timeout;

	log.normal("Creating a promise for output detection with a %sms timeout", timeout );
	return new PromiseTimeout( async (f,r) => {
	    this._output_promises.push( r );

	    function check_line( line ) {
		if ( checker_callback( line ) === true ) {
		    stream.off("line", check_line );
		    f( line );
		}
	    }
	    stream.on("line", check_line );
	}, timeout, "detect output" );
    }

    kill ( signal, timeout ) {
	if ( this._process === undefined ) {
	    throw new Error(`Tried to stop '${this.binary}' when it was never started.`);
	}

	if ( this._process.kill( signal ) === false )
	    throw new Error(`Failed to send signal ${signal} to ${this.toString()}`);

	if ( timeout === undefined )
	    timeout			= this.options.timeout;

	return new PromiseTimeout( this._closed.then.bind(this._closed), timeout, "kill process" );
    }

    async stop ( timeout ) {
	if ( this._stopped === true ) {
	    log.warn("Tried to stop %s when it was already stopped", this.toString() );
	    return await this._closed;
	}

	if ( timeout === undefined )
	    timeout			= this.options.timeout;

	try {
	    await this.kill("SIGTERM", timeout / 2 );
	} catch ( err ) {
	    if ( err instanceof TimeoutError ) {
		await this.kill("SIGKILL", timeout / 2 );
	    }
	}
	this._stopped			= true;

	return await this._closed;
    }

    close ( timeout ) {
	return timeout === undefined
	    ? this._closed
	    : new PromiseTimeout( this._closed.then.bind(this._closed), timeout, "close process" );
    }

    toString () {
	return `[PID: ${this.pid}] (${this.name}` + (this.args.lenth ? ` ${this.args.join(" ")}` : "") + ")";
    }
}

module.exports = {
    SubProcess,
    TimeoutError,
};
