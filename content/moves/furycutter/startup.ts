// 连斩层数的载体：共享身份 world_combat:status/furycutter，振幅即层数 0..2（对应 1／2／4 刀）。
// 它只借身份，行为（换招清零、落空清零、存续提示）全部由本单元的 rules.ts 与 skill.ts 写。
StartupEvents.registry("mob_effect", event => event.create("world_combat:furycutter_momentum")
    .beneficial()
    .color(0x8AC44A)
    .tag("world_combat:status/furycutter")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
