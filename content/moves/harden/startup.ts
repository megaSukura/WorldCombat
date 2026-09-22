// 晶壳：一个真实有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份 world_combat:status/harden。
// amplifier 记录这段防护抬起的防御级数；窗口走完、被清除或被重击打裂时由本单元 skill.ts 从移除事件里原样收回。
// 「削伤与碎壳」这一层由本单元 skill.ts 的 GuardEffects 规则承担，效果只负责身份与级数。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:harden_shell")
    .beneficial()
    .color(0xCFE8E4)
    .tag("world_combat:status/harden")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
