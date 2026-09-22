// 焕然一新留下的「清爽」窗口：借共享身份 world_combat:status/clearheaded，只提供身份、时长与图标。
// 行为（在窗口内拒绝毒／灼／麻三类状态）写在本单元 skill.ts 的 CombatStatus.gate 贡献里，效果本身不做逐 tick 行为。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:clearheaded").beneficial().color(0x9CE07A)
        .tag("world_combat:status/clearheaded").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
