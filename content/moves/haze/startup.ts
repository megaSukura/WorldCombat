// 黑雾的「被抹平」标记：一个真实中性 MobEffect，对任何活体是同一个身份 world_combat:status/hazy，
// 只在真正有等级被抹掉时挂上，表示这个人刚刚被黑雾扫过。等级归零本身写在各战斗者自己的阶梯上，
// 消费方用 CombatStatus.has(world, actor, "hazy") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:haze_veil")
    .category("neutral")
    .color(0x2E2E38)
    .tag("world_combat:status/hazy")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
