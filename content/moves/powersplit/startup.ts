// 有限双端连接身份；伤害份额归对应的有限预算载体拥有。
StartupEvents.registry("mob_effect", event => event.create("world_combat:powersplit_window")
    .category("neutral").color(0xFFB060).tag("world_combat:status/powersplit").tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => {}));