// 青草场地：草地身份的载体。身份 `world_combat:status/grassyterrain` 是本单元读取的机读键；
// 只借身份、不带共享行为，行为写在本单元的 rules.ts。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:grassyterrain_ground").beneficial().color(0x7CCB5A)
        .tag("world_combat:status/grassyterrain").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
