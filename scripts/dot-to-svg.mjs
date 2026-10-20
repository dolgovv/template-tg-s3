// Renders Graphviz DOT from stdin to SVG on stdout.
// Uses Graphviz compiled to WebAssembly, so no system `dot` binary is needed.
import { text } from "node:stream/consumers";
import { instance } from "@viz-js/viz";

const viz = await instance();
process.stdout.write(viz.renderString(await text(process.stdin), { format: "svg" }));
