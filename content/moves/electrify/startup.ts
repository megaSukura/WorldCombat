// 输电：注册通电状态。只借共享身份 `world_combat:status/electrify`，行为写在本单元的 rules.ts，
// 别的作者以后可以用同一个 tag 消费“下一次出招带电”。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:electrified").harmful().color(0xFFD84A)
        .tag("world_combat:status/electrify").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
