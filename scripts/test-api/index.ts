import { $ } from "bun";
import chalk from "chalk";
import newman from "newman";

const { env } = process;

const APIURL = env.APIURL || `http://localhost:${env.PORT || 3000}/api`;
const USERNAME = env.USERNAME || "jake";
const EMAIL = env.EMAIL || "jake@jake.jake";
const PASSWORD = env.PASSWORD || "hunter2A";
const POSTMAN_COLLECTION =
	env.POSTMAN_COLLECTION ||
	"https://raw.githubusercontent.com/gothinkster/realworld/refs/heads/main/api/Conduit.postman_collection.json";

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

console.info(chalk.gray("Resetting database"));

try {
	await $`bun run db:reset --force`.quiet();
} catch (error) {
	if (!(error instanceof Bun.$.ShellError)) throw error;
	console.error(chalk.red(`Database reset failed with code ${error.exitCode}`));
	console.error(error.stdout.toString());
	console.error(error.stderr.toString());
	process.exit(1);
}

console.info(chalk.gray("Running API tests"));

newman.run(
	{
		collection: POSTMAN_COLLECTION,
		delayRequest: 500,
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
