const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const expect				= require('chai').expect;
const { SubProcess }			= require('../../src/index.js');
const why				= require('why-is-node-running');

// setTimeout(() => {
//     console.log( why() );
// }, 3000 );

function basic_tests () {
    it("should start and stop simple process", async function () {
	let child			= new SubProcess( "sleep", "10" );

	log.debug("Wait for spawn event");
	await child.ready();

	let status			= await child.kill();

	expect( status.code		).to.equal( null );
	expect( status.signal		).to.equal( "SIGTERM" );
    });

    it("should start very short process", async function () {
	let child			= new SubProcess( "python3", "-c", "print('Hello')" );

	log.debug("Wait for spawn event");
	await child.ready();

	try {
	    log.debug("Wait for spawn event");
	    await child.output("Hello");
	} finally {
	    let status			= await child.close();

	    expect( status.code		).to.equal( 0 );
	    expect( status.signal	).to.equal( null );
	}
    });

    it("should start and await specific output", async function () {
	this.timeout( 20_000 ); // every now and then python3's http server takes a while to start up

	// Option '-u' turns off python's buffered outputs so that we get the I/O in realtime.
	//
	//   - See https://docs.python.org/3/using/cmdline.html#cmdoption-u for more info
	//
	let child			= new SubProcess( "python3", "-um", "http.server", "8888" );

	child.stdout( line => {
	    log.silly("\x1b[2;37m%s STDOUT\x1b[0;2m: %s\x1b[0m", "python3 http.server", line );
	});

	child.stderr( line => {
	    log.silly("\x1b[2;31m%s STDERR\x1b[0;2m: %s\x1b[0m", "python3 http.server", line );
	});

	log.debug("Wait for spawn event");
	await child.ready();

	try {
	    log.debug("Wait for output");
	    await child.output("Serving HTTP on 0.0.0.0 port 8888", 19_000 );
	} finally {
	    let status			= await child.kill();

	    expect( status.code		).to.equal( null );
	    expect( status.signal	).to.equal( "SIGTERM" );
	}
    });

    it("should start and stop ignorant daemon", async function () {
	let child			= new SubProcess( "node", path.resolve( __dirname, "../ignorant_daemon.js" ) );

	child.stdout( line => {
	    log.silly("\x1b[2;37m%s STDOUT\x1b[0;2m: %s\x1b[0m", "ignorant_daemon.js", line );
	});

	child.stderr( line => {
	    log.silly("\x1b[2;31m%s STDERR\x1b[0;2m: %s\x1b[0m", "ignorant_daemon.js", line );
	});

	log.debug("Wait for spawn event");
	await child.ready();

	await child.output("Server is running");

	log.info("Stop process");
	let status			= await child.stop( 100 );

	expect( status.code		).to.equal( null );
	expect( status.signal		).to.equal( "SIGKILL" );
    });

    it("should start and stop ignorant daemon manually", async function () {
	let child			= new SubProcess( "node", path.resolve( __dirname, "../ignorant_daemon.js" ) );

	try {
	    child.stdout( line => {
		log.silly("\x1b[2;37m%s STDOUT\x1b[0;2m: %s\x1b[0m", "ignorant_daemon.js", line );
	    });

	    child.stderr( line => {
		log.silly("\x1b[2;31m%s STDERR\x1b[0;2m: %s\x1b[0m", "ignorant_daemon.js", line );
	    });

	    log.debug("Wait for spawn event");
	    await child.ready();

	    await child.output("Server is running");

	    try {
		log.info("Sending SIGTERM and expecting timeout");
		await child.kill( "SIGTERM", 10 );
	    } catch ( err ) {
		expect( err.message	).to.have.string("Failed to kill process within 0.01 second");
	    }
	} finally {
	    log.info("Sending ultimate kill signal");
	    let status			= await child.kill("SIGKILL");

	    expect( status.code		).to.equal( null );
	    expect( status.signal	).to.equal( "SIGKILL" );
	}
    });
}

function errors_tests () {
    it("should fail to spawn because bad binary", async function () {
	let child			= new SubProcess( "qocefkj" );

	let failed			= false;
	try {
	    await child.ready();
	} catch (err) {
	    failed			= true;
	    expect( err.message		).to.have.string("ENOENT");
	}

	expect( failed			).to.be.true;
    });
}

describe("SubProcess", () => {

    describe("Basic", basic_tests );
    describe("Errors", errors_tests );

});
