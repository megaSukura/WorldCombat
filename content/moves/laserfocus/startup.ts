// 锐意：把精神收束成一道细光落在自己的下一次出手上。效果只承载共享身份
// world_combat:status/laserfocus（消费方用 CombatStatus.has(world, actor, "laserfocus")）。
// 行为写在本单元 skill.ts 的伤害元数据规则里：带锐意者的下一次伤害结算被抬成必定要害，命中后由
// world_combat:damage_applied 的入场规则用掉这层锐意。效果本身不做逐 tick 行为。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:laserfocus_edge")
    .beneficial()
    .color(0xFFC24A)
    .tag("world_combat:status/laserfocus")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
