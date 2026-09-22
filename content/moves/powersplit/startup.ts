// 力量平分的平分窗口：一个只承载共享身份 world_combat:status/powersplit 的可见标记，
// 标出「两人还压在同一刻度上」的这段时间；真正撤销数值改动的行为写在本单元 skill.ts 里
// （读机读标记 world_combat:powersplit_mark），消费方用 CombatStatus.has(world, actor, "powersplit") 按身份读取。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:powersplit_window").category("neutral").color(0xFFB060)
        .tag("world_combat:status/powersplit").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
