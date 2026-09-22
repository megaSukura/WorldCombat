// 增强拳：一段可见的「拳已变硬」窗口，只承载共享身份 world_combat:status/hardened。
// 物攻等级本身由 NativeEffects.boost 写入公共能力阶梯；窗口走完或被清除时，由本单元 skill.ts 从移除事件里
// 按 amplifier 原样收回。窗口不是伤害来源，是「拳头硬了」这件事的读法与 AI 判断是否已经起势的判据。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:poweruppunch_hardened")
    .beneficial()
    .color(0xE8A24F)
    .tag("world_combat:status/hardened")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
