// 诅咒：两个共享身份。
//   world_combat:cursed_hex 带 world_combat:status/curse —— 幽灵形态压在对手身上、每隔一段扣血的债。
//   world_combat:curse_pact 带 world_combat:status/cursed_pact —— 非幽灵形态押上敏捷换来的短暂契约烙印。
// 效果只提供身份、时长与图标；扣血写在 skill.ts 的绑定效果里，契约也不做逐 tick 行为。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:cursed_hex").harmful().color(0x7A4FB0)
        .tag("world_combat:status/curse").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
    e.create("world_combat:curse_pact").beneficial().color(0xB4453F)
        .tag("world_combat:status/cursed_pact").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
