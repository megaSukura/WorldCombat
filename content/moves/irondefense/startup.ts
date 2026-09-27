// 铁壳：一个真实有益 MobEffect，对宝可梦、原版生物、玩家是同一个身份 world_combat:status/irondefense，
// 显示载体实际抬起的防御级数（amplifier）。
// 「铁」这一层不在这里带属性修饰：Minecraft 会把效果自身的属性修饰按 amplifier+1 乘算，
// 而铁壁要的是固定的抗击退 0.6 / 移速 -15%，因此改用 MobEffects.fixedAttributes 按载体投影（见 skill.ts），
// 与载体显示的防御级数分开，不会被放大。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:iron_defense_shell")
    .beneficial()
    .color(0x8C9AA6)
    .tag("world_combat:status/irondefense")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
