// 冰雹：被雹砸过的状态载体。身份 `world_combat:status/hail` 是本单元与别的单元共用的机读键；
// 只借身份、不带共享行为，砸击与免疫写在 rules.ts。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:hail_struck").harmful().color(0xBFE9FF)
        .tag("world_combat:status/hail").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
