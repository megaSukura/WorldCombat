// 心之眼：读穿对手的下一个动作，把自己的准星拉满。效果只承载共享身份
// world_combat:status/mindreader（消费方用 CombatStatus.has(world, actor, "mindreader")）。
// 行为写在本单元 skill.ts 里：提交时给施法者拉满命中等级、把目标照亮（minecraft:glowing），下一次伤害命中时
// 由 world_combat:damage_applied 的入场规则用掉这层读并原样收回命中等级。效果本身不做逐 tick 行为。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mindreader_eyes")
    .beneficial()
    .color(0xB07CE8)
    .tag("world_combat:status/mindreader")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
