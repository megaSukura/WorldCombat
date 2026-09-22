# 构建与开发

使用 JDK 21、Node.js 22+、Python 3.11+。版本由[依赖表](../../manifests/dependencies.toml)、Gradle 锁文件与 npm 锁文件确定，首次构建会从官方仓库下载开发依赖。

```sh
npm ci --ignore-scripts --no-audit --no-fund
./gradlew assembleDist
```

Windows 使用 `gradlew.bat`。`dist/mods/` 是两个自有 jar，`dist/kubejs/` 是正式 play 的客户端、服务端、startup 脚本及资源。面向玩家的安装步骤见[INSTALL](../../release/INSTALL.md)。`assembleAuthoringDist` 另将 SDK 与可选 profiles 输出到 `build/authoring-dist/`。

## 检查

`./gradlew check` 运行通用编译、运行时与脚本检查。具体改动也可按范围运行现有任务；单元作者的检查入口见作者指南。

`checkLocalClientInterop` 聚合本机原生 Rhino/LDLib 与字形渲染检查，保留已有开发入口。它们依赖已准备的 Windows 客户端启动清单及研究 jar，不属于干净克隆的通用检查。真实操作体验由人工试玩；隐藏专服回归使用现有工具与独立运行目录。

## 开发实例

内容装配：`npm run build:content`。将指定组合安装到自己的开发实例：

```sh
npm run install:demo -- runs/my-test play
```

Gradle 的 `:world-combat-core:runClient`、`:cobblemon-world-combat:runClient` 会打开游戏窗口；相应 `runServer` 使用无 GUI 专服。核心、完整适配分别使用 `runs/core-*`、`runs/full-*`。开发实例需要安装对应脚本组合，单独启动 Java Mod 不等于装好了正式内容。

## 发布准备

1. 设置根目录 `gradle.properties` 中的 `mod_version`，同步 npm 包版本及发布说明。
2. 运行 `assembleDist`；确认本次改动对应的检查结果。
3. 运行 `python tools/package-release.py`，生成 `build/releases/<版本>/` 下的玩家包与对应源码包。脚本只打包项目提供的文件，不下载或夹带第三方 Mod。
4. 公开仓库从清洁源码包创建；本地研究与商业素材曾进入开发历史，因此保留开发仓库，不把其旧历史公开。
5. 确认开源许可、仓库归属与发布平台后，上传同版本二进制及完整源码。首版体验范围见 `release/CHANGELOG.md`。

对外发布时保持两端版本一致，并附第三方通知与许可证。项目文件的协议不覆盖用户另行安装的 Minecraft/Cobblemon 资产。
