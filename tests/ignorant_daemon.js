
const http				= require('http');

console.log("I am process # %s", process.pid );

process.on("SIGTERM", () => {
    console.error("Not terminating because I am an ignorant daemon");
});
// process.on("SIGINT", function (signal, code) {
//     console.log("Not terminating because I am an ignorant daemon: %s (%s)", code, signal );
// });
console.log("Finished setting up signal listeners");

const server				= http.createServer( (req, res) => {
});

server.listen( 28_576, "0.0.0.0", async function () {
    const addr				= this.address();
    console.log("Server is running on %s:%s", addr.address, addr.port );
});
