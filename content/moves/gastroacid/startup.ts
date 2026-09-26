// 胃酸载体负责原生护甲修饰；特性压制层绑定这一次载体，清除时立即失效。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:gastroacid").harmful().color(0x9BE049)
        .tag("world_combat:status/gastroacid").tag("world_combat:status/identity_only")
        .modifyAttribute("minecraft:generic.armor", "world_combat:gastroacid_armor", -0.25, "add_multiplied_total")
        .effectTick((entity: any, amplifier: number) => { });
});
