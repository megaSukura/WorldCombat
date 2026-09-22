// 聚光灯：被照亮者身上的共享身份 world_combat:status/spotlight（消费方用 CombatStatus.has(world, actor, "spotlight")）。
// 效果只提供身份、时长与图标；被照亮时的暴露加成与牵制写在 skill.ts，效果本身不做逐 tick 行为。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:spotlighted").harmful().color(0xFFF0A8)
        .tag("world_combat:status/spotlight").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
