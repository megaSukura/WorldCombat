// 龙尾：被尾扫弹飞的活体身上留下的印记。只借共享身份 `world_combat:status/routed`（溃退），
// 行为（失去目标、被弹开、沿背离施法者的方向被逐出交战圈）写在本单元的 skill.ts 里。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:dragontail_routed")
    .harmful()
    .color(0x7C5CD8)
    .tag("world_combat:status/routed")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
