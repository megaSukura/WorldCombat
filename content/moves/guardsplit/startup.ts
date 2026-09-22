// 防守平分的平分窗口：一个只承载共享身份 world_combat:status/guardsplit 的可见标记，
// 标出「两人还压在同一厚度上」的这段时间；真正撤销数值改动的行为写在本单元 skill.ts 里
// （读机读标记 world_combat:guardsplit_mark），消费方用 CombatStatus.has(world, actor, "guardsplit") 按身份读取。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:guardsplit_window").category("neutral").color(0x70C8C0)
        .tag("world_combat:status/guardsplit").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
