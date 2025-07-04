import { existsSync } from "node:fs";
import { watch as fsWatch } from "node:fs/promises";
import { parseArgs } from "node:util";
import { $ } from "bun";
import chalk from "chalk";
import newman from "newman";
import { debounce } from "radashi";
import { testEnv } from "@/core/test-env";

const APIURL = testEnv.APIURL;
const USERNAME = testEnv.USERNAME;
const EMAIL = testEnv.EMAIL;
const PASSWORD = testEnv.PASSWORD;
const POSTMAN_COLLECTION = testEnv.POSTMAN_COLLECTION;

// Parse command line arguments
const { values } = parseArgs({
	args: Bun.argv,
	options: {
		"skip-db-reset": {
			type: "boolean",
		},
		watch: {
			type: "boolean",
		},
	},
	strict: true,
	allowPositionals: true,
});

// check --skip-db-reset param
const shouldSkipDbReset =
  values["skip-db-reset"] ?? testEnv.SKIP_DB_RESET;
const isWatchMode = values.watch || false;

// Performance options
const DELAY_REQUEST = testEnv.DELAY_REQUEST;
// Note: Newman doesn't support parallel execution, but we can reduce delays

console.info(chalk.gray("Checking Bedstack health"));

// first query the api to see if it's running
try {
	const response = await fetch(`${APIURL}/health`);
	if (!response.ok) {
		console.error(
			chalk.red("Bedstack health check failed, couldn't run API tests"),
		);
		process.exit(1);
	}
} catch {
	console.error(
		chalk.red(
			"Bedstack is not running, run the following command to start it:",
		),
	);
	console.info(chalk.cyan("bun dev"));
	process.exit(1);
}

// Function to reset database
async function resetDatabase() {
	if (shouldSkipDbReset) {
		console.info(chalk.yellow("Skipping database reset (SKIP_DB_RESET=true)"));
		return;
	}

	console.info(chalk.gray("Resetting database"));

	try {
		await $`bun run db:reset --force`.quiet();
	} catch (error) {
		if (!(error instanceof Bun.$.ShellError)) throw error;
		console.error(
			chalk.red(`Database reset failed with code ${error.exitCode}`),
		);
		console.error(error.stdout.toString());
		console.error(error.stderr.toString());
		process.exit(1);
	}
}

// Function to run API tests
async function runApiTests() {
	console.info(chalk.gray(`Running API tests with ${DELAY_REQUEST}ms delay`));

	return new Promise<void>((resolve, reject) => {
		newman.run(
			{
				collection: POSTMAN_COLLECTION,
				delayRequest: DELAY_REQUEST,
				reporters: "cli",
				globals: {
					values: [
						{ key: "APIURL", value: APIURL },
						{ key: "USERNAME", value: USERNAME },
						{ key: "EMAIL", value: EMAIL },
						{ key: "PASSWORD", value: PASSWORD },
					],
				},
			},
			(err: unknown) => {
				if (err) {
					console.error(err);
					reject(err);
				} else {
					console.info(`[${chalk.green("✓")}] API tests complete`);
					resolve();
				}
			},
		);
	});
}

// Function to run full test suite (reset DB + run tests)
async function runFullTestSuite() {
	await resetDatabase();
	await runApiTests();
}

// Test running state
let isTestRunning = false;

// Debounced test runner for watch mode
const debouncedRunTests = debounce({ delay: 300 }, async () => {
	if (isTestRunning) {
		return; // Skip if already running
	}

	isTestRunning = true;
	console.info(chalk.yellow("\n🔄 File changed - running tests..."));
	try {
		await runFullTestSuite();
		console.info(chalk.gray("Watching for changes..."));
	} catch (err) {
		console.error(chalk.red("Test run failed:", err));
		console.info(chalk.gray("Watching for changes..."));
	} finally {
		isTestRunning = false;
	}
});

// Run tests once or in watch mode
if (isWatchMode) {
	console.info(
		chalk.cyan("🔍 Watch mode enabled - tests will rerun on file changes"),
	);

	const watchDirs = ["src", "packages", "services", "tests"];
	const existingDirs = watchDirs.filter((dir) => existsSync(dir));
	if (existingDirs.length === 0) {
		console.warn(
			chalk.yellow("No watchable directories found. Exiting watch mode."),
		);
		process.exit(0);
	}
	const watchers = existingDirs.map((dir) => fsWatch(dir, { recursive: true }));

	// Run initial test suite
	try {
		await runFullTestSuite();
	} catch (err) {
		console.error(chalk.red("Initial test run failed:", err));
		process.exit(1);
	}

	console.info(chalk.gray("Watching for changes..."));

	// Watch for changes and rerun tests
	(async () => {
		// Process events one at a time, skipping when tests are running
		for (const watcher of watchers) {
			(async () => {
				for await (const _event of watcher) {
					debouncedRunTests();
				}
			})();
		}
	})();
} else {
	// Run tests once
	try {
		await runFullTestSuite();
	} catch (err) {
		console.error(chalk.red("API tests failed:", err));
		process.exit(1);
	}
}
