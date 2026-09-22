// 求雨：淋湿状态的载体。带两个身份——`world_combat:status/rained` 是本招的机读键（雨区内水 / 火属性
// 结算由本单元读它），`world_combat:status/soaked` 是共享的“湿”身份，别的单元可以只问湿没湿。
// 只借身份、不带共享行为，行为写在本单元的 rules.ts。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:raindance_soaked").harmful().color(0x3E8FD0)
        .tag("world_combat:status/rained").tag("world_combat:status/soaked").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
