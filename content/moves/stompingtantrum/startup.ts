// 憋愤资格的可见提示；真实前次进攻结果由 ExecutionOutcomes 读取，图标不参与伤害判定。
StartupEvents.registry("mob_effect", event => event.create("world_combat:stompingtantrum_frustration")
    .beneficial()
    .color(0xB5522E)
    .tag("world_combat:status/stompingtantrum")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
