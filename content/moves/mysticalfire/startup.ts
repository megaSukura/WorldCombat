// 魔法火焰的缠火载体：本单元自己的状态身份 world_combat:status/mysticalfire，行为写在 skill.ts 的缠火绑定里。
// 缠火跨过施放动作、由独立托管效果维持；载体被提前清除（牛奶、驱散）时，绑定同步解除。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mysticalfire_wrap")
    .harmful()
    .color(0xE060C0)
    .tag("world_combat:status/mysticalfire")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
