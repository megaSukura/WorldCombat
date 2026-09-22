# 保持 Java jar 不变的脚本迭代

Java jar 提供通用执行、原生桥接、网络与渲染宿主；发行包把玩法放在独立的 `kubejs/` 中。已有接口能表达的流程、数据、策略与表现，都可以在脚本内重新设计和组合，包括新增内容单元。脚本并不局限于调整现有参数，也不需要为每次脚本修改更新两个 Mod 的版本。

长期修改在 `content/` 的 TypeScript 源码进行，编译后的 JavaScript 才是游戏读取的内容。直接修改发行 JS 也能生效，但下一次从源码装配会覆盖它。使用匹配的源代码版本维护改动，保留每次内容变更记录。

## 构建与安装

```sh
# 按实际修改单元检查；共享层修改运行对应工程检查
node tools/check-unit.mjs content/moves/<id>

# 基于已检查的基线，重新装配各 profile 和资源；不运行 Gradle、不改 jar
node tools/build-content.mjs --assemble-only

# 复制 play 的脚本与资源到工作区内的实例
node tools/install-demo.mjs runs/my-test play
```

`--assemble-only` 仍检查完整 profile 和资源，但省去所有独立单元逐一重复检查；它适用于已检查基线上的集成刷新。第一次构建或全量依赖核对使用 `node tools/build-content.mjs`。工作区以外的游戏实例按安装说明复制对应 `kubejs/` 内容，保留一份可回退的旧版本。

## 让修改生效

| 修改内容 | 不改 Java jar 时的应用方式 |
| --- | --- |
| 服务端招式、AI、效果与规则逻辑 | 有 `/kubejs reload server-scripts` 入口；复杂行为变更优先重新进入单人世界或重启服务器，见下方当前限制 |
| 配方、标签、数据包内容 | `/reload`；同时涉及原生注册时重启 |
| 客户端脚本 UI、HUD、粒子场景 | `/kubejs reload client-scripts` |
| 客户端脚本与贴图、语言等资源 | F3+T，同时重载客户端脚本与资源 |
| startup 中新增或改变原生物品、MobEffect、属性等注册 | 重启对应客户端和服务器；注册仍可由脚本实现，不等于必须改 Java |
| 宿主尚未提供的操作、原生挂钩/Mixin、Java 网络包或渲染器等 | 按实际缺口修改对应 Java/Kotlin 层并更新 jar |

服务端脚本从服务器本地读取，客户端脚本和资源从每位玩家的本地实例读取。RPC 与场景数据同步不承担代码分发；涉及两端的修改需要双方安装相应脚本。更换脚本后保持接口和资源相容，不能仅凭 jar 版本相同判断内容一致。

## 当前重载边界

服务端重载会重建脚本注册和普通 JS 内存，结束正在执行的动作及其投射物、关联资源。已结算的伤害、物品与 PP 不回滚；原生保存的个体数据保留。声明为 persistent 的效果按 schema/migrate 恢复数据和剩余过程，actor/action 生命周期的效果结束。客户端重载会清理旧 UI、回调、场景与粒子，再加载新定义。

当前野生时钟采用 actor 生命周期，重载清理后尚缺完整的已有野生重新挂载流程；这是源码审查发现的限制，不能把热重载视作完整的无缝恢复。涉及这类行为时采用重新进入世界或重启服务器。注册重载失败也没有自动恢复上一份脚本的事务保障，需修正内容或恢复备份后重新加载。

实现入口：[服务端/客户端重载](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/script/CombatKubePlugin.java)、[效果生命周期](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/runtime/effect/EffectRuntime.java)、[野生宿主](../../content/behavior/pokemon-wild.ts)。

## 游戏内验收与审批

现有验收工具保存可编辑反馈和验收状态，供开发者读取；它没有自动调用 AI 或安装补丁。可以按用户已确认的反馈修改源码、检查、安装脚本，再按受影响范围安排刷新，全程保持兼容的 Java jar 不变。

若以后增加游戏内审批闭环，应明确显示准备改什么、涉及哪类脚本、是否需要重启，由本地协调工具执行获批修改并保留回退内容。具体玩法的审批与执行能力边界分别处理，当前发布没有宣称已具备这条自动流程。
