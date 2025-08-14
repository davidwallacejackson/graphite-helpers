// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import type { ExecaError } from "execa" with { "resolution-mode": "import" };
const { execaCommand } = require("execa");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "graphite-helpers" is now active!'
  );

  const bashOutputChannel = vscode.window.createOutputChannel("Graphite: Bash");
  context.subscriptions.push(bashOutputChannel);

  const graphiteCommand = (id: string, command: string) => {
    const disposable = vscode.commands.registerCommand(id, async () => {
      try {
        const projectRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
          ? vscode.workspace.workspaceFolders[0].uri.fsPath
          : undefined;

        await runBashCommand(command, bashOutputChannel, { clear: true, cwd: projectRoot });
      } catch {
        // Error already reported to the output channel by the helper
      }
    });
    context.subscriptions.push(disposable);
    return disposable;
  };

  graphiteCommand(
    "graphite-helpers.graphiteModify",
    "gt modify --all",
  );

  graphiteCommand(
    "graphite-helpers.graphiteSubmitStack",
    "gt submit --stack",
  );

  graphiteCommand(
    "graphite-helpers.graphiteUp",
    "gt up",
  );

  graphiteCommand(
    "graphite-helpers.graphiteDown",
    "gt down",
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

export type RunBashOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  show?: boolean;
  clear?: boolean;
  shellPath?: string; // Defaults to /bin/bash
  title?: string; // Optional banner/title to show before output
};

async function runBashCommand(
  command: string,
  output: vscode.OutputChannel,
  options?: RunBashOptions
): Promise<number> {
  const workingDirectory =
    options?.cwd ??
    (vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined);

  if (options?.clear) {
    output.clear();
  }
  if (options?.show !== false) {
    output.show(true);
  }

  if (options?.title) {
    output.appendLine(options.title);
  }
  output.appendLine(`$ ${command}`);

  try {
    const subprocess = execaCommand(command, {
      shell: options?.shellPath ?? "/bin/bash",
      cwd: workingDirectory,
      env: options?.env ?? process.env,
    });

    subprocess.stdout?.on("data", (data: Buffer) => {
      output.append(data.toString());
    });

    subprocess.stderr?.on("data", (data: Buffer) => {
      output.append(data.toString());
    });

    const { exitCode } = await subprocess;
    output.appendLine(`\n[Process exited with code ${exitCode}]`);
    return exitCode ?? 0;
  } catch (error: unknown) {
    const err = error as ExecaError;
    output.appendLine(
      `Error: ${err.shortMessage ?? err.message ?? String(error)}`
    );
    throw error;
  }
}
