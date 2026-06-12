npx depcruise --init
npx depcruise src --include-only "^src" --output-type dot | dot -T svg > dependency-graph.svg