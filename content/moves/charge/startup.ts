// 充电：注册充能状态。只借共享身份 `world_combat:status/charge`，行为写在本单元的 rules.ts，
// 别的作者以后可以用同一个 tag 消费“充能”。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:charge_up").beneficial().color(0xFFD54A)
        .tag("world_combat:status/charge").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
