# WorldCombat 0.1.0-alpha.1 安装

这是首个公开测试版本。使用 Java 21、Minecraft **1.21.1**、NeoForge **21.1.250**。游戏客户端与专用服务器使用同一版 WorldCombat 和内容文件。

## 安装步骤

1. 创建对应版本的 NeoForge 实例，从下表的官方渠道安装依赖。
2. 将发行压缩包中的 `mods/` 和 `kubejs/` 合并到游戏实例根目录。两个 WorldCombat jar 都在 `mods/`；`kubejs/` 中的 startup、server、client 脚本和 assets/data 一起保留。
3. 完整重启实例，进入世界。联机时服务端也安装相同内容；服务端可以省略下表标为仅客户端的依赖。

| 依赖 | 本版锁定版本 | 安装位置 |
| --- | --- | --- |
| [Cobblemon](https://modrinth.com/mod/cobblemon) | 1.8.0+1.21.1，NeoForge 版 | 两端 |
| [KubeJS](https://modrinth.com/mod/kubejs) | 2101.7.2-build.377 | 两端 |
| [Rhino](https://modrinth.com/mod/rhino) | 2101.2.7-build.81 | 两端 |
| [Kotlin for Forge](https://modrinth.com/mod/kotlin-for-forge) | 5.12.0 完整发行包 `kotlinforforge-5.12.0-all.jar` | 两端 |
| [LDLib2](https://github.com/Low-Drag-MC/LDLib2) | 2.2.40，NeoForge 1.21.1 完整 all 发行版 | 两端 |
| [MadParticle](https://modrinth.com/mod/mad-particle) | 0.8.21，NeoForge 版 | 客户端 |
| [T88](https://www.curseforge.com/minecraft/mc-mods/t88/files/5745052) | 0.12.3，文件 5745052 | 客户端 |
| [Curios](https://modrinth.com/mod/curios) | 9.5.1+1.21.1 | 可选；使用相关装备时两端安装 |

发行包只提供本项目文件，外部依赖独立安装。若启动器自动安装依赖，请核对最终版本。T88 该版本的 1.21 声明由本版 NeoForge 的原生兼容矩阵支持。

## 开始操作

用 Cobblemon 原生操作取得并放出宝可梦。默认 **Z/X/C/V** 对应四个招式位，**G** 打开指挥交互，**H** 打开偏好设置，原生详情页查看招式说明。按键可在游戏的控制设置中调整；遇到其他 Mod 的快捷键冲突时从这里修改。

本项目把交战放到世界中，玩家可正常移动、攻击、使用物品和指挥伙伴。安装包不自动创建验收场地；开发用的验收启动器与测试存档不包含在发行包中。

## 整合包配置

- 自然生成：`config/cobblemon/main.json`，沿用 Cobblemon 的 `pokemonPerChunk`、`ticksBetweenSpawnAttempts`、`maximumSpawnsPerPass`、`minimumDistanceBetweenEntities`。目前默认生成较稀疏；可先将前两项从 `0.15`、`120` 调为 `0.3`、`60`。
- 速度映射、PP 容量倍率、脱战时间：`config/cobblemon_world_combat-server.toml`，首次运行创建，由服务端同步。已有世界的 `serverconfig/` 同名文件优先。`moves.ppCapacityMultiplier` 为容量倍率，默认 `1.0`。
- 单招偏好默认值：`kubejs/config/worldcombat/skills/<招式ID>.json`；个体偏好在游戏里设置。

修改后重新进入单人世界，或重启服务器并重连。

玩法源码可以单独编译、安装脚本而保持 Java jar 不变；具体重载方式与限制见[脚本迭代指南](https://github.com/megaSukura/WorldCombat/blob/main/docs/development/script-iteration.md)。

## 更新与反馈

本版会接管 Cobblemon 世界交战。首次尝试使用独立实例和世界副本；升级前保存世界。替换本项目的两个 jar，以及 `kubejs/server_scripts/worldcombat/`、`client_scripts/worldcombat/`、`startup_scripts/worldcombat/` 中本项目旧文件，避免两版脚本同时注册；其他 Mod 的脚本、玩家配置和存档保留。

遇到问题，记录招式/特性 ID、操作与目标、单人或联机、实际现象，附当次 `logs/latest.log` 或崩溃报告。画面问题最好附截图或短视频。分享日志前可遮去服务器地址与聊天等个人信息。已知范围见同包 `CHANGELOG.md`。
