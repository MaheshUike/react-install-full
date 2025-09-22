#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { execSync } from "child_process";

// __dirname polyfill in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name("react-install-full")
  .version("2.0.0")
  .description(
    "Scaffold a React app with Redux, Context, Router, Tailwind, Axios — in JS or TS."
  )
  .argument("<project-name>", "name of the project")
  .option(
    "-y, --yes",
    "skip prompts (defaults: JS + Redux+Context+Router ON, Tailwind+Axios OFF)"
  )
  .action(async (projectName, options) => {
    await createReactApp(projectName, options);
  });

function isValidName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

async function createReactApp(projectName, options) {
  try {
    if (!isValidName(projectName)) {
      console.error(
        chalk.red("❌ Invalid name. Use letters, numbers, - and _.")
      );
      process.exit(1);
    }
    const projectPath = path.resolve(projectName);
    if (fs.existsSync(projectPath)) {
      console.error(chalk.red(`❌ Folder "${projectName}" already exists.`));
      process.exit(1);
    }

    // Defaults
    let config = {
      lang: "js",
      includeRedux: true,
      includeContext: true,
      includeRouter: true,
      includeTailwind: false,
      includeAxios: false,
    };

    // Prompts
    if (!options.yes) {
      const answers = await inquirer.prompt([
        {
          type: "list",
          name: "lang",
          message: "Language?",
          choices: ["JavaScript", "TypeScript"],
          default: "JavaScript",
        },
        {
          type: "confirm",
          name: "includeRedux",
          message: "Include Redux Toolkit?",
          default: true,
        },
        {
          type: "confirm",
          name: "includeContext",
          message: "Include Context API?",
          default: true,
        },
        {
          type: "confirm",
          name: "includeRouter",
          message: "Include React Router?",
          default: true,
        },
        {
          type: "confirm",
          name: "includeTailwind",
          message: "Include Tailwind CSS?",
          default: false,
        },
        {
          type: "confirm",
          name: "includeAxios",
          message: "Include Axios?",
          default: false,
        },
      ]);
      config = {
        ...config,
        ...answers,
        lang: answers.lang === "TypeScript" ? "ts" : "js",
      };
    }

    // Create project folder
    await fs.ensureDir(projectPath);

    // Import templates dynamically (ESM way)
    const templatesModule = await import(
      path.join(__dirname, `templates-${config.lang}.js`)
    );
    const files = templatesModule.getTemplates(config);

    // package.json
    await writePackageJson(projectPath, projectName, config);

    // Write files
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(projectPath, rel);
      await fs.ensureDir(path.dirname(full));
      await fs.writeFile(full, content);
    }

    // Install deps
    console.log(chalk.yellow("\n📦 Installing dependencies…\n"));
    execSync("npm install", { cwd: projectPath, stdio: "inherit" });

    // Tailwind setup
    if (config.includeTailwind) {
      console.log(chalk.yellow("\n⚙️  Setting up Tailwind…\n"));
      execSync("npx tailwindcss init -p", {
        cwd: projectPath,
        stdio: "inherit",
      });
      const tw = path.join(projectPath, "tailwind.config.js");
      let twCfg = await fs.readFile(tw, "utf8");
      twCfg = twCfg.replace(
        /content:\s*\[\s*\]/,
        "content: ['./public/index.html','./src/**/*.{js,jsx,ts,tsx}']"
      );
      await fs.writeFile(tw, twCfg, "utf8");
    }

    console.log(chalk.green.bold(`\n🎉 ${projectName} ready!`));
    console.log(chalk.cyan(`\ncd ${projectName}\nnpm start\n`));
  } catch (e) {
    console.error(chalk.red("❌ Error:"), e.message);
    process.exit(1);
  }
}

async function writePackageJson(root, appName, cfg) {
  const isTS = cfg.lang === "ts";
  const pkg = {
    name: appName,
    version: "0.1.0",
    private: true,
    type: "commonjs",
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      "react-scripts": "5.0.1",
      "web-vitals": "^2.1.4",
    },
    devDependencies: {},
    scripts: {
      start: "react-scripts start",
      build: "react-scripts build",
      test: "react-scripts test",
      eject: "react-scripts eject",
    },
  };

  if (cfg.includeRedux) {
    pkg.dependencies["@reduxjs/toolkit"] = "^1.9.7";
    pkg.dependencies["react-redux"] = "^8.1.3";
  }
  if (cfg.includeRouter) pkg.dependencies["react-router-dom"] = "^6.22.0";
  if (cfg.includeAxios) pkg.dependencies["axios"] = "^1.6.8";
  if (cfg.includeTailwind) {
    pkg.devDependencies["tailwindcss"] = "^3.4.0";
    pkg.devDependencies["postcss"] = "^8.4.35";
    pkg.devDependencies["autoprefixer"] = "^10.4.18";
  }
  if (isTS) {
    Object.assign(pkg.devDependencies, {
      typescript: "^5.4.0",
      "@types/react": "^18.2.8",
      "@types/react-dom": "^18.2.4",
      "@types/react-router-dom": "^5.3.3",
    });
  }

  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify(pkg, null, 2)
  );
}

program.parse();
