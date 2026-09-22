# 批量委派工具

除了 Codex 自身的子代理功能，Codex 还可以调用本机 OpenCode，批量运行大量可独立拆分的小任务。本项目已实际采用过这一方法；它是可按任务规模选用的补充工具。

适合这种方式的工作：大量文件审查、资料提取、按独立目录交付的小型修改。协调者用程序生成任务清单和检查覆盖，模型处理每个条目的语义与创作，最后由协调者汇总。任务总数与同时运行数分别配置。

## 已经使用过的案例

2026-09-22，收集189位招式作者的报告：程序提取原文与行号，切成12个任务，前11个各16份、最后一个13份；通过 OpenCode `batch_task` 配置为3并发，使用该 OpenCode 环境配置的 `deepseek/deepseek-flash`，省略 `agent` 字段。每个任务核对自己的报告与当前代码，只写独立的 `audit-NN.json`。

最终12份产物覆盖001–189组，汇总为446条候选意见，再由协调者归并和实施。此次侧会话记录时，已重新读取12份产物确认组号无重复、无遗漏。原始调度结果为 **9 ok / 3 error**：3次约5分钟的 `fetch failed` 没有反映子任务的实际完成情况，后续核对会话与落盘结果后收齐产物。传输修补见下文。

可直接查看的证据：

- [调用脚本与任务卡归档](../../archive/author-feedback/2026-09-22/opencode-batch/)：桥接脚本、12项清单、参数、原始进度/结果、第一项输入和输出。
- [覆盖结果](../../archive/author-feedback/2026-09-22/coverage.json)、[汇总意见](../../archive/author-feedback/2026-09-22/requests.json)和[最终处理](../../archive/author-feedback/2026-09-22/decisions.json)。

本例验证了整批提交、受控并发与独立文件交付。并发3是这次的选择；更大的清单可沿同一入口提交，并发度按服务额度、内存和文件所有权配置。

## 实际调用路径

本轮调用的是本机已安装的 **OpenCode 插件** `batch-agent.ts`。协调者启动隐藏的 OpenCode HTTP 服务，用其 SDK 创建父会话，再执行插件导出的 `plugin.tool.batch_task.execute(args, context)`。父会话用于归组；插件负责创建和运行子会话。

本机已使用的入口：

| 用途 | 路径 |
| --- | --- |
| OpenCode | `D:/NodeJS/node_modules/opencode-ai/bin/opencode.exe` |
| 批处理插件 | `C:/Users/pc/.config/opencode/plugins/batch-agent.ts` |
| SDK | `C:/Users/pc/.config/opencode/node_modules/@opencode-ai/sdk/dist/client.js` |
| 已使用的桥接脚本 | [run-batch.mjs](../../archive/author-feedback/2026-09-22/opencode-batch/run-batch.mjs) |

这些是本机路径；换机器时先确认安装位置、插件和 OpenCode 模型配置。脚本直接导入 TypeScript 插件，本次使用 Node.js 24。DeepSeek 是这个 OpenCode 案例的模型配置，Codex 原生子代理仍可独立使用。

## 操作步骤

以下命令用于以后主动发起一批任务。在仓库根目录使用 PowerShell 7；本次记录没有执行服务启动或任务派发。

### 1. 新建批次目录并复制桥接脚本

```powershell
$batchProject = 'F:/MyProject/WorldCombat'
Set-Location -LiteralPath $batchProject
$batchRelative = 'build/opencode-batch/' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$batchDirectory = Join-Path $batchProject $batchRelative
New-Item -ItemType Directory -Path $batchDirectory -ErrorAction Stop | Out-Null
$batchArchive = Join-Path $batchProject 'archive/author-feedback/2026-09-22/opencode-batch'
$batchRunner = Join-Path $batchDirectory 'run-batch.mjs'
Copy-Item -LiteralPath (Join-Path $batchArchive 'run-batch.mjs') -Destination $batchRunner
$batchSource = Get-Content -LiteralPath $batchRunner -Raw
$batchSource = $batchSource.Replace(
    "const root='F:/MyProject/WorldCombat', dir=root+'/build/author-kernel-review';",
    'const root=process.cwd(), dir=import.meta.dirname;'
)
Set-Content -LiteralPath $batchRunner -Value $batchSource -Encoding utf8
```

这样父会话记录、进度和结果都进入本次目录，历史批次保留。运行时工作目录仍为仓库根目录。

### 2. 准备任务卡、条目和参数

核心分工是三个文件：`prompt_file` 给共同任务卡，`items_file` 给每个任务的输入/输出及变量，`batch-args.json` 给调度参数。任务卡使用 `{{input}}`、`{{output}}` 等占位符。每项明确自己的读写范围和交付文件；共享实现由协调者整合。

下面按本轮归档输入重建同样的12项报告审查批次。它只准备文件；换任务时替换这段清单生成逻辑和任务卡。

```powershell
Copy-Item -LiteralPath (Join-Path $batchArchive 'review-template.md') -Destination (Join-Path $batchDirectory 'prompt.md')
@'
import json, sys
from pathlib import Path
directory, relative = Path(sys.argv[1]), sys.argv[2]
archive = Path("archive/author-feedback/2026-09-22")
reports = json.loads((archive / "extracted.json").read_text(encoding="utf-8"))
def write(name, value):
    (directory / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
items = []
for offset in range(0, len(reports), 16):
    number = len(items) + 1
    chunk = [dict(row) for row in reports[offset:offset + 16]]
    for row in chunk:
        filename = row["source"].replace("\\", "/").rsplit("/", 1)[-1]
        row["source"] = (archive / "reports" / filename).as_posix()
    write(f"input-{number:02}.json", chunk)
    items.append({"groups": [row["group"][-3:] for row in chunk],
                  "input": f"{relative}/input-{number:02}.json",
                  "output": f"{relative}/audit-{number:02}.json"})
write("items.json", items)
write("batch-args.json", {
    "prompt_file": f"{relative}/prompt.md", "items_file": f"{relative}/items.json",
    "model": "deepseek/deepseek-flash", "strategy": "parallel", "concurrency": 3,
    "timeout_ms": 3600000, "label": "report-review", "cleanup": False
})
'@ | python - $batchDirectory $batchRelative
```

`timeout_ms` 是每个子任务的上限。`cleanup:false` 保留会话以便核查。本例省略 `agent`，沿用 OpenCode 默认 Agent；任务权限沿用该环境配置。

### 3. 启动隐藏服务，预览后派发

```powershell
$batchListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$batchListener.Start()
$batchPort = $batchListener.LocalEndpoint.Port
$batchListener.Stop()
$batchProcess = Start-Process -FilePath 'D:/NodeJS/node_modules/opencode-ai/bin/opencode.exe' `
    -ArgumentList @('serve', '--hostname', '127.0.0.1', '--port', "$batchPort") `
    -WorkingDirectory $batchProject -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $batchDirectory 'server.log') `
    -RedirectStandardError (Join-Path $batchDirectory 'server.err.log')
@{ port = $batchPort; pid = $batchProcess.Id } | ConvertTo-Json | Set-Content `
    -LiteralPath (Join-Path $batchDirectory 'batch-server.json') -Encoding utf8
Get-Content -LiteralPath (Join-Path $batchDirectory 'server.log')
```

看到 `opencode server listening on http://127.0.0.1:...` 后执行；若服务仍在启动，稍后再读日志。

```powershell
node $batchRunner (Join-Path $batchDirectory 'batch-args.json') --dry-run
node $batchRunner (Join-Path $batchDirectory 'batch-args.json')
```

先检查 dry run 展开的任务卡、条目数、模型和读写范围，再执行第二行。`dry_run` 不派发子任务；当前桥接脚本会创建或复用父会话。正式执行等待整批返回，并持续写进度文件；协调者可通过后台命令会话运行它，同时做独立的本地工作。

### 4. 收结果并关闭本批服务

```powershell
$batchProgress = Get-Content -LiteralPath (Join-Path $batchDirectory 'report-review-progress.json') -Raw | ConvertFrom-Json
$batchProgress.metadata.children | Select-Object index, status, sessionID, durationMs
Get-Content -LiteralPath (Join-Path $batchDirectory 'report-review-result.json') -Raw
```

每项的 JSON/源码文件是主要交付；终端只需输出路径和短结论。协调者检查文件能否读取、任务是否完整覆盖，并对语义和代码做集中复核。发生传输错误时，先依据记录的 `sessionID` 查询实际子会话和已写文件，再决定是否重派。

确认子任务全部结束后，只关闭本批记录的服务进程：

```powershell
$batchState = Get-Content -LiteralPath (Join-Path $batchDirectory 'batch-server.json') -Raw | ConvertFrom-Json
$batchOwnedProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($batchState.pid)"
if ($batchOwnedProcess.Name -eq 'opencode.exe' -and
    $batchOwnedProcess.CommandLine -like "*serve --hostname 127.0.0.1 --port $($batchState.port)*") {
    Stop-Process -Id $batchState.pid
}
```

## 本轮留下的操作经验

- 归档的桥接脚本已包含传输修补：用 `node:http` 为 SDK 提供 `fetch`，让批处理自身的超时和取消信号管理长请求，处理首次运行中约5分钟即 `fetch failed` 的情况。首轮 `batch-result.json` 保留修补前的真实状态。
- `items_file` 由程序生成，大批任务清单和长结果保存在文件中，协调者按需要读摘要与异常项。
- 多批同时运行时要合计所有批次的并发，并明确文件所有权。此插件直接使用同一仓库，没有自动创建 Git worktree。
- 共享AI实现任务曾触及1小时及25分钟的真实任务上限，最终由协调者续作。适合复用的模式是大量边界清楚的小任务，加上集中整合与验证。
