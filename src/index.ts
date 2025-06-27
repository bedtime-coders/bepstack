import chalk from "chalk";
import { app } from "@/core/app";
import { env } from "@/core/env";

console.info(chalk.gray("Starting Bedstack"));

app.listen(env.PORT, ({ hostname, port }) => {
	console.info(
		`Bepstack is up and running on ${chalk.blue(`http://${hostname}:${port}`)}`,
	);
});
