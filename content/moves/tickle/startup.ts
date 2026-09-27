// 挠痒：痒意的身份。只借共享身份 world_combat:status/ticklish，行为（下降攻击与防御等级）写在本单元的
// skill.ts 里，由 boostWindow 随本状态维持攻击与防御下降；本状态不控制行为、
// 也不延长降级，只用来提醒伙伴别再重复挠。别的作者以后可以用同一个 tag 消费「痒意」。启动脚本不引用服务端
// 共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:ticklish_fit")
    .harmful()
    .color(0xF2C94C)
    .tag("world_combat:status/ticklish")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
