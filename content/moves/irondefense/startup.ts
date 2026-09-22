// 铁壳：一个真实有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份 world_combat:status/irondefense。
// 「铁」这一层在此：铁壳期间击退抗性大幅提高（native knockback 推不动），移动速度下降（沉得挪不开）。
// 防御等级本身由 NativeEffects.boost 写入公共能力阶梯；窗口走完或被清除时由本单元 skill.ts 从移除事件里原样收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:iron_defense_shell")
    .beneficial()
    .color(0x8C9AA6)
    .modifyAttribute("minecraft:generic.knockback_resistance", "world_combat:iron_defense_knock", 0.6, "add_value")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:iron_defense_weight", -0.15, "add_multiplied_total")
    .tag("world_combat:status/irondefense")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
