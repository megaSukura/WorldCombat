// 光壳：一段可见的窗口，承载共享身份 world_combat:status/stockpile；amplifier 记录当前层数。
// 防御与特防等级由 NativeEffects.boost 写入公共能力阶梯；层数另存在 world_combat:stockpile_mark 里，
// 被击中时由本单元 skill.ts 从伤害事件里扣层、扣等级，窗口走完或被清除时照数收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:stockpile_charge")
    .beneficial()
    .color(0xF0B23A)
    .tag("world_combat:status/stockpile")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
