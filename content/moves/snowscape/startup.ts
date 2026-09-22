// 雪景：被雪覆住的状态载体。身份 `world_combat:status/snow` 是本单元与别的单元共用的机读键；
// 只借身份、不带共享行为，防御加成与地形写在 rules.ts。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:snowscape_powder").beneficial().color(0xEAF6FF)
        .tag("world_combat:status/snow").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
