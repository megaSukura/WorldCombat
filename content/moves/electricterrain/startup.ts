// 电气场地：把电流按进交界区的地面，站上去的人带电。身份 `world_combat:status/electricterrain` 是本单元读取的
// 机读键；带它的人电招加成、无法入眠。只借身份、不带共享行为，行为写在本单元的 rules.ts。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:electricterrain_ground").beneficial().color(0xFFE24A)
        .tag("world_combat:status/electricterrain").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
