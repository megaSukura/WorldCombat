// 临别礼物：哀悼的身份。行为（概率失手）写在 skill.ts 的 CombatStatus.actions 贡献里，按这个 tag 判定，
// 所以任何来源的哀悼都生效。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:memento_grief")
    .harmful()
    .color(0x2E1A47)
    .tag("world_combat:status/grieving")
    .effectTick((entity: any, amplifier: number) => { }));
