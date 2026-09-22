// 巴投：被摔过肩、扔到身后的活体身上留下的印记。只借共享身份 `world_combat:status/routed`（溃退），
// 行为（失去目标、被扔到施法者身后、被逐出交战圈）写在本单元的 skill.ts 里。启动脚本不引用服务端共享库，
// 标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:circlethrow_routed")
    .harmful()
    .color(0xD89A6A)
    .tag("world_combat:status/routed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
