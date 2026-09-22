// 卷球：一个真实有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份 world_combat:status/defensecurl。
// amplifier 记录这段防护抬起的防御级数；窗口走完或被清除时由本单元 skill.ts 从移除事件里原样收回。
// 「滚」这一层由 skill.ts 在受击事件里驱动：滚动不是这个效果自带的属性，效果只负责身份与级数。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:defensecurl_ball")
    .beneficial()
    .color(0xD9B382)
    .tag("world_combat:status/defensecurl")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
