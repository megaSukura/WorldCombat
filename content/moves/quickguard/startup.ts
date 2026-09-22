// 快板：一段极短的、只对先制攻击生效的整队防御窗口，承载共享身份 world_combat:status/quickguard。
// 先制伤害的按量吸收由共享 GuardEffects 的 pool 承担；先制变化招式的拒绝由本单元 skill.ts 的提交点监听承担。
// 身份只是「谁撑着这面快板」的读法与 AI 的重复施放判据。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:quick_guard")
    .beneficial()
    .color(0xBFE3FF)
    .tag("world_combat:status/quickguard")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
