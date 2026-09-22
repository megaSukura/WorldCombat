# WorldCombat

把 Cobblemon 的战斗带进 Minecraft 世界。玩家照常移动、攻击、使用物品和建造，伙伴自主行动，也接受目标、招式与站位指令。

**当前版本：0.1.0-alpha.2，公开测试版。** [下载与版本记录](https://github.com/megaSukura/WorldCombat/releases/tag/v0.1.0-alpha.2)。目标环境是 Minecraft 1.21.1 / NeoForge 21.1.250 / Java 21。正式内容已包含 756 个招式实现和 24 个特性单元；覆盖数量与实际体验成熟度分别看待，仍在持续打磨。

WorldCombat replaces Cobblemon's turn-based encounters with real-time interaction in the Minecraft world. This is an early alpha for Minecraft 1.21.1 and NeoForge, with script-driven abilities and extensible companion behavior.

## 安装与游玩

按[安装说明](release/INSTALL.md)准备依赖，将发行包中的 `mods/` 和 `kubejs/` 合并到实例根目录，然后重启。客户端与服务器使用相同版本的本项目文件。依赖独立从官方渠道安装；粒子表现使用 MadParticle/T88，界面使用 LDLib2。

默认 Z/X/C/V 使用四个招式位，G 操作伙伴指挥，H 调整偏好；全部以游戏控制设置中的绑定为准。培养、配招、PP、捕捉等沿原生系统接入，数值与行为由世界战斗内容消费。

[版本范围与已知问题](release/CHANGELOG.md) · [整合包配置](docs/development/pack-configuration.md)

## 从源码构建

需要 JDK 21、Node.js 22 或更新的受支持版本、Python 3.11+。在仓库根目录执行：

```sh
npm ci --ignore-scripts --no-audit --no-fund
./gradlew assembleDist
```

Windows 使用 `gradlew.bat assembleDist`。产物在 `dist/`，布局可直接合并到游戏实例；外部 Mod 不打入本项目 jar。`./gradlew check` 运行通用工程检查，依赖已准备本机客户端的检查使用独立 `checkLocalClientInterop` 任务。

`python tools/package-release.py` 将当前发行内容及公开源码快照打成两个版本一致的压缩包。公开源码包含构建脚本、锁定依赖、共享库、独立内容和工程检查，排除本地存档、缓存、商业素材归档和 Git 历史。详细步骤见[开发指南](docs/development/getting-started.md)。

## 扩展内容

项目由通用 Java 核心、Cobblemon 适配、可复用脚本库和最终内容单元组成。招式、特性、性格、独立 AI 行为及世界交互可以独立设计；原生资料作为灵感，共享能力作为实现材料。

从[内容作者入口](docs/CONTENT_AUTHORING.md)开始，按需求阅读[共享能力](docs/authoring/shared-capabilities.md)与当前源码。参考资格以实际人工验收范围为准，工程夹具用于验证接口。

玩法脚本独立于 Java jar，可以在现有接口范围内持续更新。构建、安装与重载边界见[脚本快速迭代](docs/development/script-iteration.md)。

## 反馈与许可

反馈请附本项目版本、招式/特性 ID、目标、操作步骤与实际现象，以及当次日志；画面问题附截图或视频。联机问题同时说明客户端和服务端版本。

项目使用 **GPL-3.0-or-later**，附[本项目 Minecraft 互操作额外许可](LICENSE-MINECRAFT-EXCEPTION.txt)。完整文本见 [LICENSE](LICENSE)，外部依赖和资源保留[各自许可](THIRD_PARTY_NOTICES.md)。分发二进制时同时提供匹配的完整源码。
