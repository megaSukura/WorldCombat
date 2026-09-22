// 刺耳声的耳鸣载体：借共享身份 world_combat:status/deafened（与爆音波的耳鸣同一个身份）。
// 效果只提供身份、时长与图标，行为（下降物防等级）写在本单元的 skill.ts 里，由 NativeEffects.boost
// 落到宝可梦的原生防御等级或其他生物的护甲属性上；别的作者以后可以用同一个 tag 消费「耳鸣」。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:screech_ringing")
    .harmful()
    .color(0x9AA7B8)
    .tag("world_combat:status/deafened")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
