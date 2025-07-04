import { $ } from "bun";
import chalk from "chalk";
import newman from "newman";
import { env } from "@/core/env";

const APIURL = env.APIURL;
const USERNAME = env.USERNAME;
const EMAIL = env.EMAIL;
const PASSWORD = env.PASSWORD;
const POSTMAN_COLLECTION = env.POSTMAN_COLLECTION;

// Performance options
const SKIP_DB_RESET = env.SKIP_DB_RESET;
const DELAY_REQUEST = env.DELAY_REQUEST;
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

if (!SKIP_DB_RESET) {
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
} else {
	console.info(chalk.yellow("Skipping database reset (SKIP_DB_RESET=true)"));
}

console.info(chalk.gray(`Running API tests with ${DELAY_REQUEST}ms delay`));

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
			process.exit(1);
		}
		console.info(`[${chalk.green("✓")}] API tests complete`);
	},
);
