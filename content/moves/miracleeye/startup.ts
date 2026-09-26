// 奇迹之眼的两条真实 MobEffect，让宝可梦、原版生物与玩家同样被心眼照出、同样被抬命中。
// 目标端 world_combat:miracleeye_mark 带共享身份 world_combat:status/miracleeye 与伞身份
// world_combat:status/identified；施法者端 world_combat:miracleeye_focus 带 world_combat:status/miracleeye_focus，
// 并作为命中窗口（NativeEffects.boostWindow）的真实载体，两端各自到期。启动脚本不引用服务端库。
StartupEvents.registry("mob_effect", event => {
    event.create("world_combat:miracleeye_mark")
        .harmful()
        .color(0xB07CE8)
        .tag("world_combat:status/miracleeye")
        .tag("world_combat:status/identified")
        .tag("world_combat:status/identity_only")
        // 非空回调让原生效果时钟保持运行。
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:miracleeye_focus")
        .beneficial()
        .color(0x7CD8E8)
        .tag("world_combat:status/miracleeye_focus")
        .tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
