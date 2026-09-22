// 帮助：被托举者身上的共享身份 world_combat:status/helpinghand（消费方用 CombatStatus.has(world, actor, "helpinghand")）。
// 效果只提供身份、时长与图标；下一次命中时兑现的那一下由 skill.ts 的入场规则结算，效果本身不做逐 tick 行为。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:helping_hand").beneficial().color(0xFFD98A)
        .tag("world_combat:status/helpinghand").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
