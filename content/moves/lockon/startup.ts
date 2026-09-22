// 锁定：把准星咬住一个对手的位置。三个效果都只承载共享身份 world_combat:status/lockon
// （消费方用 CombatStatus.has(world, actor, "lockon")）：
//   focus  —— 施法者身上的锁定期，只提供身份与图标；
//   track  —— 目标身上的咬住痕，轻微压低移动速度（不是完全钉死）；
//   clamp  —— 配置「钉死」时改用，完全钉住目标的移动与飞行速度。
// 行为写在本单元 skill.ts 里：提交时给目标挂 track/clamp，下一次伤害命中锁住的目标时用掉这层锁并移除痕迹。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => {
    event.create("world_combat:lockon_focus").beneficial().color(0x6FD8FF)
        .tag("world_combat:status/lockon").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:lockon_track").harmful().color(0x6FD8FF)
        .modifyAttribute("minecraft:generic.movement_speed", "world_combat:lockon_track", -0.75, "add_multiplied_total")
        .tag("world_combat:status/lockon").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
    event.create("world_combat:lockon_clamp").harmful().color(0x3FB0E8)
        .modifyAttribute("minecraft:generic.movement_speed", "world_combat:lockon_clamp", -1, "add_multiplied_total")
        .modifyAttribute("minecraft:generic.flying_speed", "world_combat:lockon_clamp", -1, "add_multiplied_total")
        .tag("world_combat:status/lockon").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
