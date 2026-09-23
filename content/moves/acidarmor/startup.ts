// 液态：两个真实有益 MobEffect，共享同一身份 world_combat:status/acidarmor，代表「溶化」的两种形态。
// acidarmor_pool —— 酸池：移动略快（+10%），并在原地留下酸池。
// acidarmor_slick —— 流身：更快（+20%），不留酸池。
// 防御由绑定液态状态的临时窗口持有；连续施放累计并续时，凝回时一起结束。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:acidarmor_pool")
    .beneficial()
    .color(0x8FE06A)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:acidarmor_pool_glide", 0.10, "add_multiplied_total")
    .tag("world_combat:status/acidarmor")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:acidarmor_slick")
    .beneficial()
    .color(0xB6F58A)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:acidarmor_slick_glide", 0.20, "add_multiplied_total")
    .tag("world_combat:status/acidarmor")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
