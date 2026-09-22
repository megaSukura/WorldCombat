// 空明：一段可见的失神窗口，承载共享身份 world_combat:status/amnesia。
// 特防等级由 NativeEffects.boost 写入公共能力阶梯，amplifier 记录这次抬起的级数；
// 缠绕心智的状态由本单元 skill.ts 在成招时按共享身份 CombatStatus.cure 忘掉。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:amnesia_blank")
    .beneficial()
    .color(0xDCEBFF)
    .tag("world_combat:status/amnesia")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
