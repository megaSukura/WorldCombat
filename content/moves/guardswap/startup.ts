// 防守互换的交换窗口：一个只承载共享身份 world_combat:status/guardswap 的可见标记，
// 标出「换来的守势还在」的这段时间；真正把等级调回原处的行为写在本单元 skill.ts 里
// （读机读标记 world_combat:guardswap_mark），消费方用 CombatStatus.has(world, actor, "guardswap") 按身份读取。
StartupEvents.registry("mob_effect", e => {
    e.create("world_combat:guardswap_window").category("neutral").color(0x6FA8C8)
        .tag("world_combat:status/guardswap").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});
