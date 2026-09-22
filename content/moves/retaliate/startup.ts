// 报仇的「哀兵」凭据：共享身份 world_combat:status/retaliate。同伴倒下的那一刻，附近还活着的同伴会带上它，
// 并记住凶手；行为（威力乘以翻倍系数、命中后泄掉）写在本单元 parameters.ts 与 skill.ts。
StartupEvents.registry("mob_effect", event => event.create("world_combat:retaliate_mourning")
    .beneficial()
    .color(0xD9D2C4)
    .tag("world_combat:status/retaliate")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
