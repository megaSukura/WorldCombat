// 唱歌：睡意载体。只借共享身份 world_combat:status/drowsy（identity_only），行为（每听一句就慢一分）
// 由本单元的 skill.ts 读取强度来写；等级用效果强度记录已经听进几句。启动脚本不引用服务端共享库，
// 所以标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:sing_drowsy")
    .harmful()
    .color(0x9B7BD8)
    .tag("world_combat:status/drowsy")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:sing_drowsy_speed", -0.12, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));
