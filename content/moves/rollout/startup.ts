// 连滚层数的载体：共享身份 world_combat:status/rollout，振幅即层数 0..4（对应 1..5 趟）。
// 它只借身份，行为（换招清零、落空清零、存续提示）全部由本单元的 rules.ts 与 skill.ts 写。
StartupEvents.registry("mob_effect", event => event.create("world_combat:rollout_momentum")
    .beneficial()
    .color(0xB2A183)
    .tag("world_combat:status/rollout")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
