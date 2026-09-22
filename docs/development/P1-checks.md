# P1 检查记录

**2026-09-13：P1 完成。构建、后台场景、核心与完整组合客户端人工检查均通过。**

| 范围 | 实际结果 |
| --- | --- |
| 构建与脚本 | 两个 Mod 构建成功；TypeScript 类型检查与 ES5 脚本编译通过，产物包含示例及 source map |
| 核心运行时 | 11 项可执行回归通过，覆盖提交／取消、冷却、句柄失效、结算去重、订阅清理、错误隔离、重载与线程约束 |
| 核心专服 | 通过实际开发命令执行编译后的投射脚本；一次命中、方块阻挡、取消、实体离场、脚本异常与资源重载通过 |
| 完整组合专服 | 伙伴放出、控制权、野生／有主生命换算、恢复、一次击败奖励及原有升级、取消收回、收回清理与冷却保留通过 |
| 旧战斗入口 | 实际调用野生、玩家、NPC、MoLang 挑战及允许／跳过取消事件的注册入口，均到达封锁点并返回标准失败结果；预热订阅受控，其他数据订阅仍能执行 |
| 保存与重启 | 原生 NBT 写盘读回通过；专服停止后重新启动，从 Cobblemon 原队伍存储恢复个体身份、生命、经验与等级，瞬态实例计数为零 |
| 依赖错误 | 缺失核心、缺失 Cobblemon、核心版本不匹配均在加载阶段给出预期的必需依赖错误 |
| 核心客户端 | 用户确认投射可见、首次命中后牛的生命为 6.0，石墙阻挡后仍为 6.0；两次动作正常结束，无 ERROR／FATAL，并已保存退出 |
| 完整组合客户端 | 用户确认伙伴正常放出、命中后小拉达生命由 15 降至 9，准星指向野生目标按 R 得到世界即时战斗提示 |
| 客户端收回与奖励 | 已提交的投射因收回结束，目标生命保持 9，实例／任务／订阅计数归零；重新放出后完成击败，日志仅有一次 21 经验奖励，用户确认摘要经验增加 |
| 客户端保存重入 | 用户确认重新进入同一世界后伙伴与增加的经验保留；脚本重新加载成功，两次离开世界均完成保存，测试客户端已正常退出 |
| 后续功能 | 捕捉、其他成长条件、多人同步及操作体验随对应功能安排 |

后台检查使用独立测试世界；伙伴场景使用 NeoForge FakePlayer 的身份与空网络连接，检验实际服务端路径。可见验证使用单人集成服务器；多人同步随首次联机单独验证。核心异常场景会产生带 `P1_EXPECTED_SCRIPT_FAILURE` 的预期错误，用来验证来源定位和问题内容停用。

完整组合新世界首次入场时，Cobblemon 为新玩家的三个默认数据文件记录了缺失文件的 ERROR。已核对上游对应默认初始化分支；文件随后正常建立，保存重入成功且日志未再次出现。

检查实现直接见[运行时回归](../../mods/world-combat-core/src/test/java/dev/worldcombat/core/runtime/RuntimeChecks.java)、[核心场景](../../mods/world-combat-core/src/test/java/dev/worldcombat/core/checks/CoreServerChecks.java)、[伙伴场景](../../mods/cobblemon-world-combat/src/test/kotlin/dev/worldcombat/cobblemon/checks/PokemonServerChecks.kt)与[原队伍重启读取](../../mods/cobblemon-world-combat/src/test/kotlin/dev/worldcombat/cobblemon/checks/SavedPartyChecks.kt)。这些测试类通过开发启动描述加载，发行 jar 中仅包含主源码。

## 复查方法

设置 JDK 21，先按[开发说明](getting-started.md)安装内容构建依赖，然后执行：

```powershell
.\gradlew.bat --gradle-user-home .gradle-user -I tools/export-server-checks.gradle build assembleDist :world-combat-core:exportServerCheckLaunch :cobblemon-world-combat:exportServerCheckLaunch
python tools/check-server.py core --scenario
python tools/check-server.py full --scenario
python tools/check-server.py full --restart
python tools/check-dependencies.py
```

后台启动脚本要求专服参数包含 `--nogui`，Windows 子进程使用隐藏方式启动，并在检查后停止。后台及本次客户端原始日志与简短结果位于本地 `build/p1-checks/`；后续客户端测试按[协作规则](../../AGENTS.md)单独确认。

下一步按“先计划、后审阅”推进 P2 操作样机。
